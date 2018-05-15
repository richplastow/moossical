import { parse, on } from '../oom-kit.js'

const apiOom3 = {
    name: 'oom-3'
  , attributes: {
        x: { parser:parse.number, onChange:[onXYZChange] }
      , y: { parser:parse.number, onChange:[onXYZChange] }
      , z: { parser:parse.number, onChange:[onXYZChange,onZChange] }
      , marker: {
            parser: parse.enum
          , onChange: [on.change]
          , valid:['none','red','green','blue']
          , linkedElements: ['main']
        }
    }
  , elements: {
        main: '.main'
      , shadow: '.shadow'
    }
}

export { apiOom3 }




//// EVENT HANDLERS

function onXYZChange (evt) {
    const { x, y, z } = this.oom.instance
    this.oom.$.main.style.transform =
        `translate3d(${x}vmin, ${y+72}vmin, ${-z}vmin)`
    this.oom.$.shadow.style.transform =
        `translate3d(${x}vmin, 72vmin, ${-z}vmin) scaleZ(0.5) rotateX(90deg)`
}

function onZChange (evt) {
    const { z } = this.oom.instance
    this.oom.$.main.style.zIndex = 97 - ~~z
}
