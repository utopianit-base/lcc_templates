  var fs = require('fs'),
      path = require('path'),
      shell = require('shelljs/global'),
      util = require('util'),
      git = require('simple-git');

  module.exports = class SharePointPublisher {

    constructor(version) {
        this.gitUrl = "https://$GITHUBKEY@github.com/lccgov/lcc_templates_sharepoint.git";
        this.version = version;
        this.repoRoot = path.normalize(path.join(__filename, '../../..'));
        this.sourceDir = path.join(this.repoRoot, 'pkg', util.format("sharepoint_lcc_templates-%s", this.version));
    }

    publish() {
        var self = this;
        console.log("Publishing new version of lcc_templates_sharepoint to npm")
        fs.mkdtemp(path.join(this.repoRoot, "lcc_templates_sharepoint"), (err, folder) => {
            git().clone(self.gitUrl, folder, function() {
                process.chdir(folder);
                cp('-r', util.format('%s\*', self.sourceDir), '.');
                exec("git add -A .");
                exec(util.format('git commit -q -m "Publishing LCC sharepoint templates version %s"', self.version));
                exec(util.format("git tag v%s"), self.version);
                exec("git push --tags origin master");
                exec("npm publish ./");
            })
        });
    }

    hasVersionUpdated(cb) {
        var version = util.format(/v%s/, this.version);
        git().listRemote(['--tags'], this.gitUrl, function(err, data) {
           if(err) return cb(err);
           if(!data) return cb(null, true);
           console.log(data.match(version))
           return cb(null, data.match(version));
        });
    }
}