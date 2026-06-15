export const sep = '/';
export const join = (...args: string[]) => args.join('/');
export const resolve = (...args: string[]) => args.join('/');
export const basename = (path: string) => path.substring(path.lastIndexOf('/') + 1);
export const extname = (path: string) => {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.substring(dot);
};
export default { sep, join, resolve, basename, extname };
