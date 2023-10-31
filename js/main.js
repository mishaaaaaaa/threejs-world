import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer, controls, position;

const objects = [];
let loader;

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
  // scene.add(box);
  camera.lookAt(box.position);

  // objects.push(box);

  // home

  loader = new GLTFLoader();

  loader.load(
    // resource URL
    "assets/small_villa/scene.gltf",
    // called when the resource is loaded
    function (gltf) {
      const model = gltf.scene;
      model.scale.set(8, 8, 8);
      model.position.set(
        model.position.x,
        model.position.y + 5,
        model.position.z
      );
      scene.add(model);
      objects.push();

      gltf.animations; // Array<THREE.AnimationClip>
      gltf.scene; // THREE.Group
      gltf.scenes; // Array<THREE.Group>
      gltf.cameras; // Array<THREE.Camera>
      gltf.asset; // Object
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    // called when loading has errors
    function (error) {
      console.log("An error happened");
    }
  );

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

  if (!controls.isLocked) return;

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  const cameraPosition = controls.getObject().position;
  raycaster.ray.origin.copy(cameraPosition).add(new THREE.Vector3(0, -10, 0));

  const intersections = raycaster.intersectObjects(objects);
  const onObject = intersections.length > 0;

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;
  velocity.y -= 9.8 * 100.0 * delta;

  direction.z = Number(moveForward) - Number(moveBackward);
  direction.x = Number(moveRight) - Number(moveLeft);
  direction.normalize();

  if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
  if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

  if (onObject) {
    velocity.y = Math.max(0, velocity.y);
    canJump = true;
  }

  const collisionRange = 10;
  const tempVelocity = velocity.clone().multiplyScalar(delta);
  const nextPosition = cameraPosition.clone().add(tempVelocity);

  let tooClose = false;

  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    const objectDirection = object.position
      .clone()
      .sub(nextPosition)
      .normalize();
    raycaster.set(nextPosition, objectDirection);
    const directionIntersects = raycaster.intersectObject(object);

    if (
      directionIntersects.length > 0 &&
      directionIntersects[0].distance < collisionRange
    ) {
      tooClose = true;
      const collisionDirection = object.position
        .clone()
        .sub(cameraPosition)
        .normalize();
      cameraPosition.add(collisionDirection.multiplyScalar(-0.1));
      break;
    }
  }

  if (!tooClose) {
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    cameraPosition.y += velocity.y * delta;
  }

  if (cameraPosition.y < 10) {
    velocity.y = 0;
    cameraPosition.y = 10;
    canJump = true;
  }

  prevTime = time;
  renderer.render(scene, camera);
}
