import { progress } from '../../asset/js/progress.js'
progress('components/oom-3/apiOom3.js')

import { $, $$, parse, update, clamp, vector, geometry, constant } from '../oom-kit.js'
const { Enum, Vector } = parse
const { ATTRIBUTE } = constant

const apiOom3 = {
    name: 'oom-3'

  , elements: {
        wrap:       { selector:'.wrap' }
      , hitzone:    { selector:'.hitzone' }
      , main:       { selector:'.main' }
      , silhouette: { selector:'.silhouette' }
      , surround:   { selector:'.surround' }
      , ground:     { selector:'.ground' }
      , shadow:     { selector:'.shadow' }
      , marker:     { selector:'.marker' }
    }

  , listeners: {
        'tick':  { fn:onTick, targets:'this' }
      , 'click': { fn (e) { this.setAttribute('y', -2) }, targets:'hitzone' }
    }

  , members: {

        //// Attributes.
        x:  { Number, ATTRIBUTE, updaters:'updateXYZRX' }
      , y:  { Number, ATTRIBUTE, updaters:'updateXYZRX' }
      , z:  { Number, ATTRIBUTE, updaters:'updateXYZRX updateZ' }
      , rx: { Number, ATTRIBUTE, updaters:'updateXYZRX' }
      , metabolism: { Metabolism, ATTRIBUTE, updaters:'updateMetabolism' }
      , marker: { Enum, ATTRIBUTE
          , valid: 'none red green blue'
          , updaters: update.enum('marker')
        }

        //// Attribute updater methods.
      , updateXYZRX
      , updateZ
      , updateMetabolism

        //// Properties.
      , prevTick:  { Number }
      , $location: { Location }
      , momentum:  { Vector }
      // , drag:      { Vector }

        //// Other methods.
      , updateLocation

    }
}

export { apiOom3 }




//// METHODS

////
function updateLocation () {
    const
        { current } = this.oom
      , { x, y, z, $location } = current
      , { x:lx, y:ly, z:lz } = $location ? $location.oom.current
          : { x:9e9, y:9e9, z:9e9 } // rarely, the entity is not in a location

    //// Usually, an element is still in the same location as before.
    if ( geometry.inside(x, y, z, lx, ly, lz, 100, 100, 100) ) return

    //// Otherwise, search for the location. @TODO deal with overlapping locations
    const $$locations = $$('oom-3-location')
    current.$Location = null // signifies not in any location
    for (let i=0; i<$$locations.length; i++) {
        const
            $location = $$locations[i]
          , { x:lx, y:ly, z:lz } = $location.oom.current
        if ( geometry.inside(x, y, z, lx, ly, lz, 100, 100, 100) ) {
            current.$location = $location
            console.log(
                '#' + this.id + ' is now in '
              + current.$location.getAttribute('windpath')
              + ', momentum: ('
              + current.momentum.vx + ', '
              + current.momentum.vy + ', '
              + current.momentum.vz
              + ')'
            );
            break
        }
    }

    ////@TODO remove this?
    // $$locations.map( $location => $location.oom.$.main.style.opacity = '0.5' )
    // if (current.$location) {
    //     current.$location.oom.$.main.style.opacity = 1
    // }

}




//// PARSERS

//// Does the same job as `parse.number()`, but defaults to a random integer
//// between 20 and 30 if `value` is falsey.
function Metabolism (value) {
    return +value || ~~(Math.random() * 20 + 10)
}

function Location (value) { //@TODO parse properly
    return value || null//{ oom: { current: { x:9e9, y:9e9, z:9e9, windpath:'none' } } }
}



//// ATTRIBUTE-UPDATE HANDLERS

function updateXYZRX (evt) {
    const { x, y, z, rx } = this.oom.current
    this.oom.$.wrap.style.transform =
        `translate3d(${x}vmin, ${y+72}vmin, ${-z}vmin) rotateX(${rx}deg)`
    this.oom.$.ground.style.transform =
        `translate3d(${x}vmin, 72vmin, ${-z}vmin)`
}

function updateZ (evt) {
    const { z } = this.oom.current //@TODO relative to camera
    this.oom.$.wrap.style.zIndex = 97 - ~~z
    this.oom.$.silhouette.style.opacity = clamp.opacity(z / 200) // fog effect on top of .main
    this.oom.$.shadow.style.opacity = clamp.opacity( (200-z) / 200 ) // fog effect on .shadow
}

function updateMetabolism (evt) {
    const { metabolism } = this.oom.current
    // this.oom.$.wrap.style.transition =
    // this.oom.$.ground.style.transition =
    //     `transform ${metabolism-5}ms linear`
    // this.oom.$.silhouette.style.transition =
    //     `opacity ${metabolism-5}ms linear`
    // this.oom.$.shadow.style.transition =
    //     `opacity ${metabolism-5}ms linear`
}




//// TICK HANDLERS

function onTick (evt) {
    const
        { current } = this.oom
      , { x, y, z, $location, momentum } = current
      , now = evt.detail
      , diff = now - current.prevTick
      , wind = $location ? $location.oom.vectorAtPoint(diff, x, y, z)
          : { vx:0, vy:0, vz:0 } // rarely, the entity is not in a location

    //// Prepare this entity for its next tick.
    current.prevTick = now

    //// Resolve all forces acting on the entity.
    let { vx, vy, vz } = vector.sum(
        diff // tell `vector.sum()` the number of ms we’re operating over
      , current // start with this entity’s current position
      , momentum // apply this entity’s motion, if any
      , wind // apply the local wind’s force and direction
      // , drag // apply drag - greater at higher speeds
    )

    //// Apply drag - greater at higher speeds.
    //// Drag is proportional to the square of velocity.
    // vx *= 1/(momentum.vx/10+1), vy *= 1/(momentum.vy+1), vz *= 1/(momentum.vz/10+1)
    const
        friction = diff * 0.03 // 1 is outer space, 0 stops all movement
      // , dragX = coefficient * vx * vx
      // , dragY = coefficient * vy * vy
      // , dragZ = coefficient * vz * vz
      , clampLevel = diff
      , momentumClamp = clamp.factory(-clampLevel, clampLevel)

/*
console.log(
    ~~(clampLevel*1000)
  , ~~(vz*1000)
  , ~~(dragZ*1000)
  , ~~(( 0>vz ? vz+dragZ : vz-dragZ )*1000)
)

vx = 0>vx ? vx+dragX : vx-dragX
vz = 0>vz ? vz+dragZ : vz-dragZ
*/

// console.log(
//     amount
//   , ~~(clampLevel*1000)
//   , ~~(vx*1000)
//   , ~~( ( ( 0 < vx ? Math.log1p(vx/99) : -Math.log1p(-vx/9) ) * 99 ) * 1000 )
// )

// if (0 < vx)
//     vx = Math.log1p(vx) // 0.1 -> 0.095, 1 -> 0.693, 10 -> 2.398, 100 -> 4.615
// else
//     vx = -Math.log1p(-vx) // -0.1 -> -0.095, -1 -> -0.693, -10 -> -2.398

vx = ( 0 < vx ? Math.log1p(vx/friction) : -Math.log1p(-vx/friction) ) * friction
vz = ( 0 < vz ? Math.log1p(vz/friction) : -Math.log1p(-vz/friction) ) * friction


/*
console.log(~~(lowestDrag*1000), ~~(clampLevel*1000), ~~(vx*1000), ~~((0 < vx
  ? lowestDrag >= vx // vx is positive...
      ? vx // ...but slow, so do nothing...
      : vx - (vx-lowestDrag)*dragAmount // ...or fast, so reduce it
  : -lowestDrag <= vx // vx is negative...
      ? vx // ...but slow, so do nothing...
      : vx - (vx-lowestDrag)*dragAmount // ...or fast, so reduce it
)*1000)

  );
    vx = 0 < vx
      ? lowestDrag >= vx // vx is positive...
          ? vx // ...but slow, so do nothing...
          : vx - (vx-lowestDrag)*dragAmount // ...or fast, so reduce it
      : -lowestDrag <= vx // vx is negative...
          ? vx // ...but slow, so do nothing...
          : vx - (vx-lowestDrag)*dragAmount // ...or fast, so reduce it
    vz = 0 < vz
      ? lowestDrag >= vz // vz is positive...
          ? vz // ...but slow, so do nothing...
          : vz - (vz-lowestDrag)*dragAmount // ...or fast, so reduce it
      : -lowestDrag <= vz // vz is negative...
          ? vz // ...but slow, so do nothing...
          : vz - (vz-lowestDrag)*dragAmount // ...or fast, so reduce it
*/

    // vx = momentumClamp(vx)
    // vy = momentumClamp(vy)
    // vz = momentumClamp(vz)

    //// Update this entity’s `momentum` object (replacing it would incur
    //// garbage-collection costs), and also update its position.
    momentum.vx = vx, momentum.vy = vy, momentum.vz = vz
    this.setAttribute('x', x + vx)
    this.setAttribute('y', y + vy)
    this.setAttribute('z', z + vz)

    //// The element may have changed locations, or may not be in any location.
    this.oom.updateLocation()
}
