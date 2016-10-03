var fs = require('fs'),
    path = require('path'),
    SharePointProcessor = require('../compiler/sharepoint_processor'),
    NunjucksProcessor = require('../compiler/nunjucks_processor'),
    process = require('process'),
    glob = require('glob'),
    _ = require('lodash'),
    util = require('util'),
    spawn = require('child_process').spawn,
    templateVersion = require('root-require')('package.json').version,
    async = require('async'),
    archiver = require('archiver');

module.exports = class ZipPackager {

    constructor() {
        this.repoRoot = path.normalize(path.join(__filename, '../../..'));
        this.baseName = util.format("lcc_templates-%s", templateVersion);
    }

    isWin() {
        return /^win/.test(process.platform);
    }

    get compiledExtensions() {
        return [".ejs", ".master", ".aspx"];
    }

    package() {
        var self = this;
        fs.mkdtemp(path.join(this.repoRoot, "lcc_templates"), (err, folder) => {
            console.log(folder);
            self.targetDir = path.join(folder, self.baseName);
            fs.mkdir(self.targetDir, function() {
                async.series([function(cb) {
                    self.prepareContents(cb)
                }, function(cb) {
                    self.createZip(cb)
                }])
            });
        });
    }

    prepareContents(callback) {
        var self = this;
        var files = glob.sync('**/*', {
            cwd: path.join(this.repoRoot, "app")
        });

        var contentTasks = [];
        contentTasks.push(function(cb) {
            self.copyStaticFiles(cb)
        });
        contentTasks.push(function(cb) {
            process.chdir(path.join(self.repoRoot, "app"));

            var templateTasks = [];
            _.forEach(files, function(file) {
                if (fs.lstatSync(file).isDirectory(file)) {
                    return;
                }

                if (self.compiledExtensions.indexOf(path.extname(file)) > -1) {
                    templateTasks.push(function(cb) {
                        self.processTemplate(file, cb)
                    });
                }
            });

            async.parallel(templateTasks, function(err, results) {
                if (err) throw err;
                cb(null, []);
            })
        });

        async.parallel(contentTasks, function(err, results) {
            if (err) throw err;
            callback(null, []);
        })
    }

    copyStaticFiles(callback) {
        var self = this;
        var copy = spawn('robocopy', [path.join(this.repoRoot, "app"), self.targetDir, "/MIR", "/XF"]
            .concat(_.map(self.compiledExtensions, (item) => util.format("*%s", item))));
        copy.on('exit', function(code) {
            fs.open(path.join(self.targetDir, "VERSION"), 'w', (err, fd) => {
                fs.writeFile(fd, templateVersion)
                callback(null, []);
            });
        });
    }

    processTemplate(file) {
        throw Error("Not implemented on base");
    }

    createZip(callback) {
        var self = this;
        var source = path.normalize(path.join(this.targetDir, ".."));
        var targetPath = path.join(this.repoRoot, "pkg");

        fs.mkdir(targetPath, function() {
            var targetFile = path.join(targetPath, util.format("%s.%s", self.baseName, self.isWin() ? "zip" : "tar")),
                archive = self.isWin() ? archiver('zip') : archiver('tar'),
                output = fs.createWriteStream(targetFile);

            output.on('close', function() {
                callback(null, [])
            });
            archive.pipe(output);
            archive.bulk([{
                expand: true,
                cwd: path.join(source, self.baseName),
                src: ['**']
            }]);

            archive.finalize(function(err, written) {
                callback(null, [])
                if (err) throw err;
            });
        });
    }
}