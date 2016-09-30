var TarPackager = require('./tar_packager'),
    NunjucksProcessor = require('./../compiler/nunjucks_processor'),
    templateVersion = require('root-require')('package.json').version,
    path = require('path'),
    fs = require('fs'),
    util = require('util');

module.exports = class NunjucksPackager extends TarPackager {
    
   constructor() {
      super();
      this.baseName = util.format("nunjucks_lcc_template-%s", templateVersion);
   }

    processTemplate(file) {
        var sourceFile = path.join(this.repoRoot, "app", file);
        var targetDir = path.join(this.targetDir, path.dirname(file))

        fs.mkdir(targetDir, function() {
            fs.open(path.join(targetDir, path.basename(file)), 'w+', (err, fd) => {
                new NunjucksProcessor(sourceFile).process(function(content) {
                    fs.writeFile(fd, content)
                });
            });
        });
    }

}