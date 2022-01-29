import { flatten } from './Utils.js'
import {
  createViewCursor,
  spaceUint64,
  spaceUint32,
  spaceUint16,
  spaceUint8,
  writeProp,
  sliceViewCursor,
  writePropIfChanged,
  moveViewCursor,
  writeUint32
} from './ViewCursor.js'

/**
 * Writes a component dynamically
 * (less efficient than statically due to inner loop)
 *
 * @param  {any} component
 */
export const writeComponent = (component, diff) => {
  // todo: test performance of using flatten in the return scope vs this scope
  const props = flatten(component)
  const changeMaskSpacer = props.length <= 8
    ? spaceUint8
    : props.length <= 16
      ? spaceUint16
      : props.length <= 32
        ? spaceUint32
        : spaceUint64

  // todo: support more than 64 props (use a function which generates multiple spacers)

  const properWriter = diff ? writePropIfChanged : writeProp

  return (v, entity) => {
    const writeChangeMask = diff ? changeMaskSpacer(v) : () => {}
    let changeMask = 0

    for (let i = 0; i < props.length; i++) {
      changeMask |= properWriter(v, props[i], entity) ? 1 << i : 0b0
    }

    writeChangeMask(changeMask)

    return changeMask > 0 ? 1 : 0
  }
}

export const writeEntity = (componentWriters, diff) => {

  const changeMaskSpacer = componentWriters.length <= 8
    ? spaceUint8
    : componentWriters.length <= 16
      ? spaceUint16
      : componentWriters.length <= 32
        ? spaceUint32
        : spaceUint64
  
  // todo: support more than 64 components (use a function which generates multiple spacers)
  
  return (v, entity) => {
    const rewind = v.cursor

    writeUint32(v, entity)

    const writeChangeMask = diff ? changeMaskSpacer(v) : () => {}

    let changeMask = 0

    for (let i = 0, l = componentWriters.length; i < l; i++) {
      const write = componentWriters[i]
      changeMask |= write(v, entity) ? 1 << i : 0
    }

    if (changeMask > 0) {
      writeChangeMask(changeMask)
      return 1
    } else {
      moveViewCursor(v, rewind)
      return 0
    }
  }
}

export const createEntityWriter = (components, diff) => writeEntity(components.map(c => writeComponent(c, diff)), diff)

export const writeEntities = (entityWriter, v, entities, idMap) => {
  const writeCount = spaceUint32(v)

  let count = 0
  for (let i = 0, l = entities.length; i < l; i++) {
    const eid = idMap ? idMap.get(eid) : entities[i]
    count += entityWriter(v, eid)
  }

  writeCount(count)

  return sliceViewCursor(v)
}

export const createDataWriter = (components, diff = false, size = 100000) => {
  const view = createViewCursor(new ArrayBuffer(size))

  const entityWriter = createEntityWriter(components, diff)

  return (entities, idMap) => {
    return writeEntities(entityWriter, view, entities, idMap)
  }
}
