import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'index.js',
  output: {
    file: 'd3-custom.js',
    format: 'umd',
    name: 'd3',
    sourceMap: true
  },
  plugins: [ 
    resolve()
  ]
};