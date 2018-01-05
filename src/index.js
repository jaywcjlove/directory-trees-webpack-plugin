// Import External Dependencies
const FS = require('fs');
const PATH = require('path');
const DirectoryTree = require('directory-tree-md');
const write = require('write');

/**
 * Generate a json tree representing a directory
 *
 * @type  {class}
 * @param {object} options - ...
 */
module.exports = class DirectoryTreePlugin {
    constructor(options) {
        let { dir, path, enhance, watch, ...otherProps } = options;
        this._options = { dir, path, enhance, watch };
        this._treeOptions = { ...otherProps };
        this.watchFiles = [];
    }
    saveFileToDir(filePathItem) {
        let { dir, filename, sep = "dir" } = this._options.watch;
        let writePath = PATH.resolve(process.cwd(), dir);
        if (filename && filename === 'underline') {
            const underlineFileName = filePathItem.replace(process.cwd() + PATH.sep, '').split(PATH.sep).join(sep || '__')
            writePath = PATH.resolve(writePath, underlineFileName);
        } else {
            writePath = PATH.join(writePath, filePathItem.replace(process.cwd() + PATH.sep, ''));
        }
        if (!FS.existsSync(filePathItem)) {
            return;
        }
        let content = FS.readFileSync(filePathItem);

        let contentOld = '';
        if (FS.existsSync(writePath)) {
            contentOld = FS.readFileSync(writePath);
        }
        if (contentOld && content.toString() === contentOld.toString()) return;
        write.sync(writePath, content);
    }
    writeFileSync() {
        const { dir, path, enhance, watch } = this._options;
        let tree = null;
        if (Array.isArray(dir)) {
            tree = dir.map((path) => DirectoryTree(path, this._treeOptions));
        } else {
            tree = DirectoryTree(dir, this._treeOptions);
        }
        const modified = enhance ? this._restructure(tree) : tree;
        const watchFiles = modified;
        const treeContent = JSON.stringify(modified);

        let contentOld = null;
        if (FS.existsSync(path)) {
            contentOld = FS.readFileSync(path);
        }
        if (!contentOld || treeContent.toString() !== contentOld.toString()) {
            write.sync(path, treeContent);
        }

        if (watch && FS.existsSync(path)) {
            let treeList = FS.readFileSync(path) || [];
            if (treeList) treeList = JSON.parse(treeList.toString());
            treeList = this.getAllWatchPath(treeList);
            // console.log('treeList:', treeList)
            treeList.forEach((filePathItem) => {
                this.saveFileToDir(filePathItem)
            })
        }
    }
    watchMarkdownFile(compilation) {
        const { dir, path, watch } = this._options;
        if (watch) {
            if (FS.existsSync(path)) {
                let content = FS.readFileSync(path) || [];
                if (content) content = JSON.parse(content.toString());
                let fileDependencies = this.getAllWatchPath(content);
                fileDependencies.forEach((filePathItem) => {
                    if (compilation.fileDependencies.some(file => file.indexOf(filePathItem) === -1)) {
                        // ...tell webpack to watch file recursively until they appear.
                        compilation.fileDependencies.push(filePathItem);
                    }
                })
            }
        }
    }
    apply(compiler) {
        compiler.plugin('emit', (compilation, done) => {
            this.writeFileSync();
            this.watchMarkdownFile(compilation)
            done()
        })
    }
    getAllWatchPath(arr, pathArr = []) {
        arr.forEach((item) => {
            if (item.type === 'file') {
                pathArr.push(item.path)
            }
            if (item.children && item.children.length > 0) {
                pathArr.concat(this.getAllWatchPath(item.children, pathArr));
            }
        })
        return pathArr;
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
