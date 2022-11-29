import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import nodePolyfills from 'rollup-plugin-polyfill-node';


export default {
  input: './dist/api.js',
  plugins: [
    resolve({ extensions: ['.js'], browser:true, preferBuiltins: true }),
    commonjs(),
    nodePolyfills(),
  ],

  output: [
  {
    file: "browser/sparqlEngine.js",
    format: 'iife',
    name: 'sparqlEngine',

    /* For some reason, the module tries to do some manipulations
    on the require global object and crashes if require is undefined.
    It looks like adding this line prevents any error from firing,
    while keeping the library working with no major issues.
    TODO: investigate and find a proper solution instead of this dirty hack */
    banner: `window.require = {}`,

  }],
};

