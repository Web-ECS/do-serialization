/**
 * Creates an internal cache of inputs to outputs for idemponent functions
 *
 * @param fn function to memoize inputs for
 * @returns {function}
 */
const memoize = (fn) => {
  const cache = new Map()
  return (input) => {
    if (cache.has(input)) return cache.get(input)
    else {
      const output = fn(input)
      cache.set(input, output)
      return output
    }
  }
}

/**
 * Recursively flattens all of a component's SoA leaf properties into a linear array
 * Function is idemponent, thus safely memoized
 *
 * @param  {object} component
 */
export const flatten = memoize((component) =>
  // get all props on component
  Object.keys(component)
    // filter out "private" props
    .filter((p) => !p.includes('_'))
    .sort()
    // flatMap props to
    .flatMap((p) => {
      if (!ArrayBuffer.isView(component[p])) {
        return flatten(component[p])
      }
      return component[p]
    })
    .flat()
)
