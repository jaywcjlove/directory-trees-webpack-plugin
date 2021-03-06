# Directory Tree Plugin

> A variation of [directory-tree-webpack-plugin](https://github.com/skipjack/directory-tree-webpack-plugin)

This plugin allows you to generate a JSON representation of a directory and all
its child nodes (files and folders). It uses the fantastic [directory-tree-md][1]
package, which does the majority of the work.

Install the plugin via NPM:

``` bash
npm i directory-trees-webpack-plugin --save
```

## Usage

This plugin is particularly useful when using [dynamic `import()`][2] statements
as you can get a mapping of all the items in the `import(...)` location. For example,
let's say we wanted to dynamically `import()` all `*.md` pages within a content 
directory:

__project__

``` diff
demo
|- package.json
|- webpack.config.js
|- /src
  |- index.js
  |- /content
    |- index.md
    |- about.md
    |- contact.md
```

__webpack.config.js__

``` js
const PATH = require('path')
const DirectoryTreePlugin = require('directory-trees-webpack-plugin')

module.exports = {
  entry: './src/index.js',
  plugins: [
    new DirectoryTreePlugin({
      dir: './src/content',
      // dir: ['./src/content','./src/content2'],
      path: './src/_content.json',
      // watch: true,
      watch: {
        dir: PATH.join('./src/.catch', './md'), // Save to the specified directory
        filename: 'underline', // "underline | dir"
        sep: '___', // Named directory path, using ___ interval
      },
      mdconf: true, // Whether to return Markdown configuration.
      extensions: /\.md/
    })
  ],
  module: {
    rules: [
      {
        test: /\.md/,
        use: [
          'html-loader',
          'markdown-loader'
        ]
      }
    ]
  },
  output: {
    path: PATH.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  }
}
```

__src/index.js__

``` js
import ContentTree from './_content.json'

ContentTree.children.forEach(page => {
  import(`./content/${item.path}.md`)
    .then(body => {
      console.log('The page object can be used to generate routes, build navigations, and more...')
      console.log(page)
      console.log('The body string can be rendered when needed...')
      console.log(body)
    })
    .catch(error => console.error('Failed to load page!'))
})
```

> Note that the example above uses promises and arrow functions. In a real app, you
> would likely polyfill these ES6+ features to ensure they work on older browsers.


## Options

The following options can be passed to the plugin:

- `dir` (string/string[]): A path to the directory that should be mapped.
- `path` (string): The path to and filename of the JSON file to create.
- `watch` (boolean/object): The path to and filename of the js file to create, Used for webpack monitoring file changes.
  - `dir` Copy to the '/path/md' directory.
  - `filename` "underline | dir"
  - `sep` filename="underline", File name to the directory, using '___' interval, default value '__'.
- `mdconf` (string): Whether to return Markdown configuration..
- `enhance` (func): A function to execute on every item in the tree (see below).

All the remaining options are passed to the `directory-tree` package. See that
package's [documentation][1] for a listing of all available options.


## Enhancing the Output

To customize each item in the tree, simply pass an `enhance` method. When this
option is passed, the plugin will recurse through the tree calling it on every
item. Here's a small example of how it can be used to change each item's `path`:

``` js
new DirectoryTreePlugin({
  dir: './src/content',
  path: './src/_content.json',
  extensions: /\.md/,
  enhance: (item, options) => {
    item.path = item.path.replace(options.dir, '')
    return item
  }
})
```

The first parameter given to the method is the `item` and the second, `options`,
contains the same options object passed to the plugin. Note that this function
__MUST__ be deterministic, if it isn't an infinite loop of tree generation will
occur.


[1]: https://github.com/uiw-react/node-directory-tree-md
[2]: https://webpack.js.org/api/module-methods/#import-
