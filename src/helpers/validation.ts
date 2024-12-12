import fs from 'fs'
import * as t from 'typanion'

export const checkFile: (path: string) => {empty: boolean; exists: boolean} = (path: string) => {
  try {
    const stats = fs.statSync(path)
    if (stats.size === 0) {
      return {exists: true, empty: true}
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {exists: false, empty: false}
    }
    // Other kind of error
    throw error
  }

  return {exists: true, empty: false}
}

export const isInteger = () => t.cascade(t.isNumber(), t.isInteger())
