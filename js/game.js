import * as THREE from './three.js/build/three.module.js';
import { OBJLoader } from './three.js/examples/jsm/loaders/OBJLoader.js';

var g = { // global game object;
  mus: document.createElement('audio'),    // music
  snd: document.createElement('audio'),    // sound
  raf: null,    // needed to cancelAnimationFrame
  mouse: null,  // Mouse position (relative to center)
  mouseAbs: {x:0,y:0}, // absolute mouse position
  cloud: null,  // whole screen cloud
  bg: [], // array of bg doms
  cursor: null, // image of mouse cursor
  cursor_cloud: null, // image of mouse cursor
  object: null, // single cv
  objects: [],  // all cvs
  doms: {},     // refs to DOM objects
  level: 0,     // game level (amount of cvs)
  lifes: 3,     // player life counter
  health: 1000, // player health counter
  chlorine: 1000,// desinfection
  dead: false,  // player dead?
  sprays: false,  // player uses chlorine
};
window.g = g; // just for easier debug

init(); // start the show

function init() {
	var container = document.createElement( 'div' );
	document.body.appendChild( container );

	g.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
	g.camera.position.z = 250;

  // audio
  g.snd.src = './audio/spray.mp3';

  // mouse cursor
  g.cursor_cloud = new Image();
  g.cursor_cloud.src = './img/can_cloud.png';
  g.cursor = new Image();
  g.cursor.src = './img/can.png';

  g.cloud = new Image();
  g.cloud.src = './img/cloud.png';

  var dom;
  for (let i = 1; i <= 4; i++) {
    dom = document.createElement( 'div' );
    dom.id = 'bg_'+i;
    dom.className = 'bg';
    dom.style.backgroundImage = "url('./img/"+ i +".jpg')";
    container.appendChild( dom );
    g.bg.push(dom);
  }

	// scene
	g.scene = new THREE.Scene();
  //g.scene.background = new THREE.Color( 0xffffff );
	var ambientLight = new THREE.AmbientLight( 0xcccccc, 0.4 );
	g.scene.add( ambientLight );
	var pointLight = new THREE.PointLight( 0xffffff, 0.8 );
	g.camera.add( pointLight );
	g.scene.add( g.camera );

  // manager
  // callback after all assets are loaded
	function loadModel() {
    if (g.object.type === 'Group') {
      g.object.traverse( function ( child ) {
        if ( child.isMesh ) {
          child.material.map = g.mat.map;
          child.material.normalMap = g.mat.normalMap;
          //child.material.roughnessMap = g.mat.roughnessMap;
          //child.material.displacementMap = g.mat.displacementMap;
          child.material.normalMap = g.mat.normalMap;
          child.material.shininess = 2000;
        }
      } );
    }
	}

	var manager = new THREE.LoadingManager( loadModel );
	manager.onProgress = function ( item, loaded, total ) {
		//console.log( item, loaded, total );
	};

  // material
  g.mat = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader(manager).load('models/one/coronavirus_spec_1024.jpg'),
    normalMap: new THREE.TextureLoader(manager).load('models/one/coronavirus_normal_1024.jpg'),
    //roughnessMap: new THREE.TextureLoader(manager).load('models/one/noise_texture.jpg'),
    //displacementMap: new THREE.TextureLoader(manager).load('models/one/coronavirus diffuse.png'),
    //aoMap: new THREE.TextureLoader(manager).load('models/one/'),
  });
  g.mat.side = THREE.DoubleSide;
  //mat.map.wrapS = mat.map.wrapT = mat.normalMap.wrapS = mat.normalMap.wrapT = mat.displacementMap.wrapS = mat.displacementMap.wrapT = mat.roughnessMap.wrapS = mat.roughnessMap.wrapT = THREE.RepeatWrapping;//mat.aoMap.wrapS = mat.aoMap.wrapT = ;
  //mat.map.repeat.set(1, 1);
  //mat.normalMap.repeat.set(1, 1);
  //mat.displacementMap.repeat.set(1, 1);
  //mat.roughnessMap.repeat.set(1, 1);
  //mat.aoMap.repeat.set(1, 1);

	var loader = new OBJLoader( manager );
  loader.load( 'models/one/coronavirus_hipoly.obj', function ( obj ) {
  //loader.load( 'models/one/Coronavirus2_lowpoly.obj', function ( obj ) {
		g.object = obj;
	});

  // 2d canvas overlay
  /*
  dom = document.createElement( 'canvas' );
  dom.id = 'canv_u';
  container.appendChild( dom );
  g.ctx_u = dom.getContext('2d');
  g.canv_u = dom;
  */

	// renderer
	g.renderer = new THREE.WebGLRenderer( { alpha: true } );
	g.renderer.setPixelRatio( window.devicePixelRatio );
	g.renderer.setSize( window.innerWidth, window.innerHeight );
  g.renderer.domElement.id = 'canv_rend';
  container.appendChild( g.renderer.domElement );

  //
  // raycaster for onmouseover
  //
  g.rayc = new THREE.Raycaster();
  g.mouse = new THREE.Vector2(-1, -1);

  //
  // on screen displays
  //
  dom = document.createElement( 'span' );
  dom.id = 'health';
  dom.style.width = '100vw';
  dom.innerHTML = 'Health:&nbsp;'+1000;
  container.appendChild( dom );
  g.doms.health = dom;

  dom = document.createElement( 'span' );
  dom.id = 'chlorine';
  dom.style.width = '100vw';
  dom.innerHTML = 'Chlorine:&nbsp;'+1000;
  container.appendChild( dom );
  g.doms.chlorine = dom;

  dom = document.createElement( 'span' );
  dom.id = 'time';
  dom.innerHTML = 'Time:';
  container.appendChild( dom );
  g.doms.time = dom;

  dom = document.createElement( 'span' );
  dom.id = 'world';
  dom.innerHTML = 'World:';
  container.appendChild( dom );
  g.doms.world = dom;

  // Event handler
  addEventListener( 'mousemove', onMouseMove, false );
	addEventListener( 'resize', onResize, false );
  addEventListener( 'wheel', onWheel, false );
  addEventListener( 'mousedown', onMouseDown, false );
  addEventListener( 'touchstart', onMouseDown, false );
  addEventListener( 'mouseup', onMouseUp, false );
  addEventListener( 'touchend', onMouseUp, false );
  addEventListener( 'contextmenu', onRMB, false );

  updateScore();
  setInterval(function(){updateScore();}, 10000);

  // 2d canvas overlay
  dom = document.createElement( 'canvas' );
  dom.id = 'canv_o';
  container.appendChild( dom );
  g.ctx_o = dom.getContext('2d');
  g.canv_o = dom;
  onResize();

  // start message
  dom = document.createElement( 'span' );
  dom.id = 'info';
  dom.innerHTML = 'Press LMB to start';
  container.appendChild( dom );
  g.doms.info = dom;
  addEventListener('click', startGame, false);
  addEventListener('touchstart', startGame, false);

}

//
// Game
//
function startGame() {
  if (!g.dead) { // start renderloop only first time we are here
    renderLoop();
  }

  g.health = 1000;
  g.chlorine = 1000;
  g.dead = false;
  g.objects = [];
  for (let i = g.scene.children.length-1; i >= 0; i--) {
    if (g.scene.children[i].type === 'Group') {
      g.scene.remove(g.scene.children[i]);
    }
  }
  nextLevel();
  g.doms.info.innerText = '';
  removeEventListener('click', startGame);
  removeEventListener('touchstart', startGame);
}
function nextLevel() {
  g.level++;
  console.log("Entering level: "+ g.level);

  for (let i = 0; i < g.bg.length; i++) {
    g.bg[i].style.display = 'none';
  }
  g.bg[g.level-1].style.display = 'block';

  for (let i = 0; i < Math.pow(2, g.level); i++) {
    spawnObj(g.object, getRandomInt(-250, 250), getRandomInt(-150, 150), getRandomInt(-1000, -500));
  }

  playMus();
}
function endLevel() {
  console.log("level end reached");
  if (!g.dead) {
    updateScore(g.health + g.chlorine);
    nextLevel();
  }
}
function doSpray(val) {
  if (g.dead) return;
  if (g.chlorine === 0) return;

  g.snd.play();

  if (g.chlorine > val) {
    g.chlorine -= val/10;
  } else {
    val = g.chlorine;
    g.chlorine = 0;
  }

  g.ctx_o.drawImage(g.cursor, g.mouseAbs.x, g.mouseAbs.y);
  g.ctx_o.drawImage(g.cloud, 0, 0, g.cloud.width, g.cloud.height, g.mouseAbs.x+48-g.cloud.width, g.mouseAbs.y+26-g.cloud.height+56, g.cloud.width, g.cloud.height);
  //document.body.style.cursor = "url('./img/can_cloud.png'), auto";

  for (let i = 0; i < g.objects.length; i++) {
    //g.objects[i].rotation.x += e.deltaY/10000;
    //g.objects[i].rotation.y += e.deltaY/10000;
    //g.objects[i].rotation.z += e.deltaY/10000;
    if (g.objects[i].position.z > -500) {
      g.objects[i].position.z -= val;
    }

  }

}
function endSpray() {
  //document.body.style.cursor = "url('./img/can.png'), auto";
}

//
// Audio
//
g.mus.addEventListener( 'ended', endLevel, false);
function playMus() {
  g.mus.src = './audio/'+ g.level +'.mp3';
  g.mus.play();
}
g.snd.addEventListener( 'ended', endSpray, false);

//
// Events
//
function onResize() {
  g.camera.aspect = window.innerWidth / window.innerHeight;
  g.camera.updateProjectionMatrix();
  g.renderer.setSize( window.innerWidth, window.innerHeight );

  g.canv_o.width = window.innerWidth;
  g.canv_o.height = window.innerHeight;
}
function onMouseMove( e ) {
  //g.mouseAbs.x = ( e.clientX - window.innerWidth / 2 ) / 2;
  //g.mouseAbs.y = ( e.clientY - window.innerHight / 2 ) / 2;
  g.mouseAbs.x = e.clientX;
  g.mouseAbs.y = e.clientY;

  // normalized -1..+1
  g.mouse.x = ( e.clientX / window.innerWidth) * 2 - 1;
  g.mouse.y = - ( e.clientY / window.innerHeight) * 2 + 1;
}
function onMouseDown( e ) {
  g.sprays = true;
}
function onMouseUp( e ) {
  g.sprays = false;
}
function onWheel( e ) {
  //doSpray( Math.abs( e.deltaY/10 ) );
}
function onRMB( e ) {
  e.preventDefault();
  //endLevel();
}

//
// Helpers
//
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function doAudioUpdates() {
  try {
    var perc = g.mus.currentTime / g.mus.duration * 100;
    if (perc * 1 !== perc) perc = 100;

    g.doms.time.style.width = (100 - perc) + 'vw';
    g.doms.time.innerHTML = 'Time:&nbsp;'+ (100 - perc).toFixed(1) +'%';
  } catch(e){}
}
function spawnObj(obj, x, y, z) {
  var o = obj.clone(true);
  o.position.x = x;
  o.position.y = y;
  o.position.z = z;
  g.objects.push( o );
  g.scene.add( o );
}
function doObjUpdates() {
  for (let i = 0; i < g.objects.length; i++) {
    // check death
    if (g.objects[i].position.z > 220) {
      g.health--;
    } else {
      // come closer
      g.objects[i].position.z += g.level;
    }
    if (g.health <= 0) {
      g.dead = true;
      g.health = 0;
      g.level = 0;
      g.doms.info.innerHTML = 'You got the flu<br/>Press LMB to restart';
      addEventListener('click', startGame, false);
      addEventListener('touchstart', startGame, false);
    }
    // they are still rotating = active
    g.objects[i].rotation.x += 1/100;
    g.objects[i].rotation.y += 1/100;
  }
}
function updateScore( health ) {
  if (health) {
    xhr('https://script.google.com/macros/s/AKfycbzx1gP9Q-Tg9vbVVtTqaTsJ3M7bFzSk9G8874sqP8w2ka_uJ00/exec?health='+ health, function(t){
      g.doms.world.innerHTML = 'World:&nbsp;'+ t;
    });
  } else {
    xhr('https://script.google.com/macros/s/AKfycbzx1gP9Q-Tg9vbVVtTqaTsJ3M7bFzSk9G8874sqP8w2ka_uJ00/exec', function(t){
      g.doms.world.innerHTML = 'World:&nbsp;'+ t;
    });
  }
}
function xhr(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (cb) {
      cb(xhr.responseText);
    }
  }
  xhr.send(null);
}

//
// Loops
//
setInterval(function(){doAudioUpdates();},1000/60);
function renderLoop() {
  g.raf = requestAnimationFrame( renderLoop );

  // mouse renderer
  g.ctx_o.clearRect(0, 0, g.canv_o.width, g.canv_o.height);
  if (!g.sprays) {
    g.ctx_o.drawImage(g.cursor_cloud, g.mouseAbs.x, g.mouseAbs.y);
  }

  if (!g.dead) {
    g.rayc.setFromCamera( g.mouse, g.camera );
    var intersects = g.rayc.intersectObjects( g.objects, true );
    for ( let i = 0; i < intersects.length; i++ ) {
      //intersects[ i ].object.material.color.set( 0xff0000 );
      intersects[ i ].object.parent.position.z -= 2* g.level;
    }
    if (g.sprays) {
      doSpray(10);
    }

    g.doms.chlorine.style.width = (g.chlorine/10) +'vw';
    g.doms.chlorine.innerHTML = 'Chlorine:&nbsp;'+ g.chlorine;

    doObjUpdates();
  }

  g.doms.health.style.width = g.health/10 +'vw';
  g.doms.health.innerHTML = 'Health:&nbsp;'+ g.health;

  g.renderer.render( g.scene, g.camera );
}
