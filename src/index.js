// Import External Dependencies
const FS = require('fs');
const PATH = require('path');
const async = require('async');
const DirectoryTree = require('directory-tree-md');
const mkdirp = require('mkdirp');

/**
 * Generate a json tree representing a directory
 *
 * @type  {class}
 * @param {object} options - ...
 */
module.exports = class DirectoryTreePlugin {
    constructor(options) {
        let { dir, path, enhance, watch } = options;
        this._options = { dir, path, enhance, watch };

        delete options.dir;
        delete options.path;
        delete options.enhance;
        delete options.watch;
        this._treeOptions = options;
        this._watchFiles = [];
    }
    saveFileToDir(filePathItem, callback) {
        let { dir, filename, sep = "dir" } = this._options.watch;
        let writePath = PATH.resolve(process.cwd(), dir);
        if (filename && filename === 'underline') {
            const underlineFileName = filePathItem.replace(process.cwd() + PATH.sep, '').split(PATH.sep).join(sep || '__')
            writePath = PATH.resolve(writePath, underlineFileName);
        } else {
            writePath = PATH.join(writePath, filePathItem.replace(process.cwd() + PATH.sep, ''));
        }
        if (!FS.existsSync(filePathItem)) {
            return callback();
        }
        let contentOld = '';
        let content = FS.readFileSync(filePathItem);

        if (FS.existsSync(writePath)) {
            contentOld = FS.readFileSync(writePath);
        }
        if (!content || content.toString() === contentOld.toString()) return callback();
        let oldFile = FS.existsSync(writePath);

        mkdirp(PATH.dirname(writePath), (err) => {
            if (err) {
                compilation.errors.push(err);
                callback();
            }
            FS.writeFile(writePath, content, (err) => {
                if (err) {
                    this.emitError('\r\nWrite to directory failed: ' + err);
                    return callback(err);
                }
                callback();
            })
        })
    }

    apply(compiler) {
        compiler.plugin('compile', this._buildTree.bind(this))
        compiler.plugin('emit', (compilation, callback) => {
            let { watch, dir } = this._options;
            if (watch) {
                let fileDependencies = this._getAllWatchPath(this._watchFiles);
                fileDependencies.forEach((filePathItem) => {
                    if (compilation.fileDependencies.some(file => file.indexOf(filePathItem) === -1)) {
                        // ...tell webpack to watch file recursively until they appear.
                        compilation.fileDependencies.push(filePathItem);
                        if (dir) {
                            this.saveFileToDir(filePathItem, callback);
                        }
                    }
                })
            } else {
                callback();
            }
        })
    }
    _getAllWatchPath(arr, pathArr = []) {
        arr.forEach((item) => {
            if (item.type === 'file') {
                pathArr.push(item.path)
            }
            if (item.children && item.children.length > 0) {
                pathArr.concat(this._getAllWatchPath(item.children, pathArr));
            }
        })
        return pathArr;
    }
    /**
     * Construct the tree and write out a JSON file
     *
     */
    _buildTree(compilation) {
        let { dir, path, enhance, watch } = this._options;
        let tree = null;
        if (Array.isArray(dir)) {
            tree = dir.map((path) => {
                return DirectoryTree(path, this._treeOptions)
            })
        } else {
            tree = DirectoryTree(dir, this._treeOptions)
        }

        let modified = enhance ? this._restructure(tree) : tree;
        this._watchFiles = modified;
        let json = JSON.stringify(modified);
        let current = FS.existsSync(path) ? FS.readFileSync(path, { encoding: 'utf8' }) : '';
        if (json !== current) {
            mkdirp(PATH.dirname(path), (err) => {
                if (err) {
                    compilation.errors.push(err);
                    return callback();
                }
                FS.writeFile(path, json, error => {
                    if (error) {
                        console.error('\r\n\r\nFailure building directory tree: ', error, '\r\n\r\n')
                    }
                })
            })
        }

    }
    /**
     * Enhance the given `item` and recursively enhance children
     *
     * @param  {object} item - The structure to enhance
     * @return {object}      - An enhanced `tree` structure
     */
    _restructure(item) {
        let allOptions = Object.assign(this._options, this._treeOptions)

        this._options.enhance(item, allOptions)

        if (item.children) {
            item.children.forEach(child => {
                this._restructure(child)
            })
        }

        return item
    }
}
