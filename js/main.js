import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { Octree } from "three/examples/jsm/math/Octree.js";
let camera, scene, renderer, controls, position;

const objects = [];

let raycaster;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

init();
animate();

function init() {
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 10, -100);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.fog = new THREE.Fog(0xffffff, 0, 750);

  const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
  light.position.set(0.5, 1, 0.75);
  scene.add(light);

  controls = new PointerLockControls(camera, document.body);

  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    instructions.style.display = "none";
    blocker.style.display = "none";
  });

  controls.addEventListener("unlock", function () {
    blocker.style.display = "block";
    instructions.style.display = "";
  });

  scene.add(controls.getObject());

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "Space":
        if (canJump === true) velocity.y += 350;
        canJump = false;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // floor

  const floorGeometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
  floorGeometry.rotateX(-Math.PI / 2);

  const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 }); // Коричневый цвет

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.set(0, 0, 0); // Установите позицию пола
  scene.add(floor);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // box

  const boxGeometry = new THREE.BoxGeometry(30, 30, 30);
  const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(0, 15, 0);
  scene.add(box);
  camera.lookAt(box.position);

  objects.push(box);

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

raycaster = new THREE.Raycaster(
  new THREE.Vector3(),
  new THREE.Vector3(0, -1, 0),
  0,
  10
);

function animate() {
  requestAnimationFrame(animate);
  if (controls.isLocked === true) {
    raycaster.ray.origin.copy(controls.getObject().position);
    raycaster.ray.origin.y -= 10;
    raycaster.ray.origin.x -= 0;
    var intersections = raycaster.intersectObjects(objects);
    var onObject = intersections.length > 0;
    var time = performance.now();
    var delta = (time - prevTime) / 1000;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions
    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;
    if (onObject === true) {
      velocity.y = Math.max(0, velocity.y);
      canJump = true;
    }
    ////EDIT
    let collisionRange = 10; //if the mesh gets too close, the camera clips though the object...
    let tempVelocity = velocity.clone().multiplyScalar(delta); //get the delta velocity
    let nextPosition = controls.getObject().position.clone().add(tempVelocity);
    let playerPosition = controls.getObject().position.clone().add(velocity);
    let tooClose = false;
    for (let i = 0; i < objects.length; i++) {
      let object = objects[i];
      let objectDirection = object.position
        .clone()
        .sub(playerPosition)
        .normalize();
      raycaster.set(nextPosition, objectDirection); //set the position and direction
      let directionIntersects = raycaster.intersectObject(object);
      if (
        directionIntersects.length > 0 &&
        directionIntersects[0].distance < collisionRange
      ) {
        //too close, stop player from moving in that direction...
        tooClose = true;
        break;
      }
    }
    if (tooClose == false) {
      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);
      controls.getObject().position.y += velocity.y * delta; // new behavior
    }
    ////EDIT
    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;
      canJump = true;
    }
    prevTime = time;
  }
  renderer.render(scene, camera);
}
