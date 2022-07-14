import resolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';
import css from 'rollup-plugin-css-only';

export default {
  input: 'index.js',
  output: {
    file: 'leaflet.js',
    format: 'umd',
    name: 'L',
    sourceMap: true
  },
  plugins: [ 
    resolve(),
    json(),
    css({ output: 'leaflet.css' })
  ]
};