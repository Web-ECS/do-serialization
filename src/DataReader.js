import { flatten } from './Utils.js'
import { createViewCursor, readProp, readUint8, readUint16, readUint32, readUint64 } from './ViewCursor.js'

export const checkBitflag = (changeMask, flag) => (changeMask & flag) === flag

/**
 * Reads a component dynamically
 * (less efficient than statically due to inner loop)
 *
 * @param  {any} component
 */
export const readComponent = (component, diff) => {
  // todo: test performance of using flatten in this scope vs return function scope
  const props = flatten(component)
  const readChanged = props.length <= 8
    ? readUint8
    : props.length <= 16
      ? readUint16
      : props.length <= 32
        ? readUint32
        : readUint64

  return (v, entity) => {
    const changeMask = readChanged(v)

    for (let i = 0; i < props.length; i++) {
      // skip reading property if not in the change mask
      if (!checkBitflag(changeMask, 1 << i)) {
        continue
      }
      const prop = props[i]
      const val = readProp(v, prop)
      prop[entity] = val
    }
  }
}

export const readComponentProp = (v, prop, entity) => {
  prop[entity] = readProp(v, prop)
}

export const readEntity = (componentReaders, diff) => {
  const readChanged = componentReaders.length <= 8
    ? readUint8
    : componentReaders.length <= 16
      ? readUint16
      : componentReaders.length <= 32
        ? readUint32
        : readUint64
  
  return (v, idMap) => {
    const id = readUint32(v)
    const entity = idMap ? idMap.get(id) : id
    
    if (entity === undefined) throw new Error('entity not found in idMap')

    const changeMask = readChanged(v)

    for (let i = 0; i < componentReaders.length; i++) {
      // skip reading component if not in the changeMask
      if (!checkBitflag(changeMask, 1 << i)) {
        continue
      }
      const read = componentReaders[i]
      read(v, entity)
    }
  }
}

export const createEntityReader = (components, diff) => readEntity(components.map(c => readComponent(c, diff)), diff)

export const readEntities = (entityReader, v, idMap, packet) => {
  while (v.cursor < packet.byteLength) {
    const count = readUint32(v)
    for (let i = 0; i < count; i++) {
      entityReader(v, idMap)
    }
  }
}

export const createDataReader = (components, diff = false) => {

  const entityReader = createEntityReader(components, diff)

  return (packet, idMap) => {
    const view = createViewCursor(packet)
    return readEntities(entityReader, view, idMap, packet)
  }
}
