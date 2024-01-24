import {
  DataTexture,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from "three";
import { ARButton, XREstimatedLight } from "three/examples/jsm/Addons.js";

// Setup
const { devicePixelRatio, innerHeight, innerWidth } = window;
const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(
  ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test", "light-estimation"],
  })
);

const scene = new Scene();
const camera = new PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.02,
  20
);

// Light
let defaultEnvironment: DataTexture;
const defaultLight = new HemisphereLight(0xffffff, 0xbbbbff, 1);
defaultLight.position.set(0.5, 1, 0.25);
scene.add(defaultLight);
const xrLight = new XREstimatedLight(renderer);
xrLight.addEventListener("estimationstart", () => {
  scene.add(xrLight);
  scene.remove(defaultLight);
  if (xrLight.environment) {
    scene.environment = xrLight.environment;
  }
});
xrLight.addEventListener("estimationend", () => {
  scene.add(defaultLight);
  scene.remove(xrLight);
  scene.environment = defaultEnvironment;
});

// Sphere
const boxGeometry = new SphereGeometry(0.1, 32, 32);
const boxMaterial = new MeshStandardMaterial({
  color: 0xffd700,
  roughness: 0.5,
  metalness: 0.5,
});
const box = new Mesh(boxGeometry, boxMaterial);
box.position.z = -1;
scene.add(box);

// Reticle
const reticle = new Mesh(
  new RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
  new MeshBasicMaterial()
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

let hitTestSourceRequested = false;
let hitTestSource: XRHitTestSource | null = null;

const loop: XRFrameRequestCallback = (_, frame) => {
  const referenceSpace = renderer.xr.getReferenceSpace();
  const session = renderer.xr.getSession()!;

  if (hitTestSourceRequested === false) {
    session.requestReferenceSpace("viewer").then(function (referenceSpace) {
      session.requestHitTestSource!({ space: referenceSpace })!.then(function (
        source
      ) {
        hitTestSource = source;
      });
    });

    session.addEventListener("end", function () {
      hitTestSourceRequested = false;
      hitTestSource = null;
    });

    hitTestSourceRequested = true;
  }

  if (hitTestSource) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);

    if (hitTestResults.length) {
      const hit = hitTestResults[0];

      reticle.visible = true;
      reticle.matrix.fromArray(hit.getPose(referenceSpace!)!.transform.matrix);
    } else {
      reticle.visible = false;
    }
  }

  if (renderer.xr.isPresenting) {
    renderer.render(scene, camera);
  }
};

renderer.setAnimationLoop(loop);
