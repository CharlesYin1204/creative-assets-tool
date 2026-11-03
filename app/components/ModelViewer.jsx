"use client";
import { useEffect, useRef, useState } from "react";
import { Box, RotateCcw, Target, Grid2X2, AlertCircle } from "lucide-react";
export default function ModelViewer({
  files,
  focus,
  onPoint,
  readOnly = false,
}) {
  const host = useRef(null),
    engine = useRef(null),
    latest = useRef({ onPoint }),
    [error, E] = useState(""),
    [status, S] = useState("加载模型…"),
    [info, I] = useState(null),
    [mark, M] = useState(false),
    [wire, W] = useState(false);
  latest.current = { onPoint, mark };
  const models = files.filter(
    (f) => f.kind === "model" && /\.(obj|glb|gltf|fbx)$/i.test(f.name),
  );
  const [chosen, C] = useState(models[0]?.id || null);
  const file = models.find((m) => m.id === chosen) || models[0];
  const anchor =
    typeof focus?.anchor === "string"
      ? JSON.parse(focus.anchor)
      : focus?.anchor;
  useEffect(() => {
    if (anchor?.modelId && models.some((m) => m.id === anchor.modelId))
      C(anchor.modelId);
  }, [focus?.id]);
  useEffect(() => {
    let stop = false,
      clean = () => {};
    E("");
    I(null);
    S("加载模型…");
    if (!file) {
      E(
        "此版本没有可解析的 OBJ、GLB/GLTF 或 FBX 模型。可切换图片预览或下载文件。",
      );
      S("");
      return;
    }
    const controller = new AbortController();
    (async () => {
      const THREE = await import("three"),
        { OrbitControls } =
          await import("three/addons/controls/OrbitControls.js");
      if (stop) return;
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      } catch {
        throw Error("浏览器不支持 WebGL，请使用图片预览或更换浏览器。");
      }
      const scene = new THREE.Scene();
      scene.background = new THREE.Color("#27283e");
      const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.minDistance = 0.2;
      controls.maxDistance = 30;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.current?.appendChild(renderer.domElement);
      const hemisphere = new THREE.HemisphereLight(0xe1ddff, 0x474755, 2.7);
      scene.add(hemisphere);
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(5, 7, 4);
      scene.add(light);
      const grid = new THREE.GridHelper(6, 12, 0x656081, 0x40405b);
      grid.position.y = -1.1;
      scene.add(grid);
      const blobs = new Map(),
        manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (
          url.startsWith("blob:") ||
          /^data:(image\/(png|jpeg|webp)|application\/octet-stream)/i.test(url)
        )
          return url;
        let decoded = url;
        try {
          decoded = decodeURIComponent(url);
        } catch {}
        const basename = decoded.replaceAll("\\", "/").split("/").pop();
        if (blobs.has(basename)) return blobs.get(basename);
        throw Error(
          "缺少模型依赖文件：" + basename + "。请在交付贴图中上传同名资源。",
        );
      });
      let object, frame, resize;
      const disposeObject = (o) =>
        o?.traverse((n) => {
          n.geometry?.dispose();
          const materials = Array.isArray(n.material)
            ? n.material
            : [n.material];
          materials.forEach((m) => {
            if (m) {
              for (const v of Object.values(m))
                if (v?.isTexture) {
                  v.source?.data?.close?.();
                  v.dispose();
                }
              m.dispose();
            }
          });
        });
      clean = () => {
        cancelAnimationFrame(frame);
        resize?.disconnect();
        controls.dispose();
        disposeObject(scene);
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        for (const blob of blobs.values()) URL.revokeObjectURL(blob);
        engine.current = null;
      };
      const data = await fetch("/api/files/" + file.id, {
        signal: controller.signal,
      });
      if (!data.ok) throw Error("模型文件读取失败或无访问权限");
      const buf = await data.arrayBuffer();
      for (const f of files.filter(
        (x) => x.id !== file.id && ["texture", "model"].includes(x.kind),
      )) {
        const r = await fetch("/api/files/" + f.id, {
          signal: controller.signal,
        });
        if (!r.ok) throw Error("依赖文件读取失败：" + f.name);
        blobs.set(f.name, URL.createObjectURL(await r.blob()));
      }
      const ext = file.name.split(".").pop().toLowerCase();
      if (ext === "obj") {
        const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
        const loader = new OBJLoader(manager),
          source = new TextDecoder().decode(buf);
        const mtlName = source.match(/^mtllib\s+(.+)$/m)?.[1]?.trim();
        if (mtlName) {
          const dependency = files.find((f) => f.name === mtlName);
          if (dependency) {
            const { MTLLoader } =
              await import("three/addons/loaders/MTLLoader.js");
            const r = await fetch("/api/files/" + dependency.id, {
              signal: controller.signal,
            });
            const material = new MTLLoader(manager).parse(await r.text(), "");
            material.preload();
            loader.setMaterials(material);
          }
        }
        object = loader.parse(source);
      } else if (ext === "fbx") {
        const { FBXLoader } = await import("three/addons/loaders/FBXLoader.js");
        object = new FBXLoader(manager).parse(buf, "");
      } else {
        const { GLTFLoader } =
          await import("three/addons/loaders/GLTFLoader.js");
        const loader = new GLTFLoader(manager);
        object = (
          await loader.parseAsync(
            ext === "gltf" ? new TextDecoder().decode(buf) : buf,
            "",
          )
        ).scene;
      }
      if (stop) {
        disposeObject(object);
        return;
      }
      let meshes = 0,
        triangles = 0;
      object.traverse((n) => {
        if (n.isMesh) {
          meshes++;
          triangles +=
            (n.geometry.index?.count ||
              n.geometry.attributes.position?.count ||
              0) / 3;
          const materials = Array.isArray(n.material)
            ? n.material
            : [n.material];
          materials.forEach((m) => {
            if (m) {
              m.side = THREE.DoubleSide;
              m.wireframe = false;
            }
          });
        }
      });
      if (!meshes) throw Error("模型中没有可显示的网格，请检查交付文件。");
      if (triangles > 2000000)
        throw Error("模型超过 200 万三角面，请下载检查或提供轻量预览模型。");
      const bound = new THREE.Box3().setFromObject(object),
        size = bound.getSize(new THREE.Vector3()),
        center = bound.getCenter(new THREE.Vector3());
      const scale = 2 / Math.max(size.x, size.y, size.z, 0.001);
      object.position.sub(center);
      const group = new THREE.Group();
      group.add(object);
      group.scale.setScalar(scale);
      scene.add(group);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.027, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffbc65, depthTest: false }),
      );
      marker.renderOrder = 100;
      marker.visible = false;
      scene.add(marker);
      const reset = () => {
        camera.position.set(3, 2.1, 3);
        controls.target.set(0, 0, 0);
        controls.update();
      };
      reset();
      engine.current = { camera, controls, marker, object, reset };
      const observer = new ResizeObserver(() => {
        if (!host.current) return;
        const { width, height } = host.current.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
      });
      resize = observer;
      observer.observe(host.current);
      const raycaster = new THREE.Raycaster();
      renderer.domElement.addEventListener("click", (e) => {
        if (!latest.current.mark || readOnly) return;
        const r = renderer.domElement.getBoundingClientRect();
        raycaster.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            -((e.clientY - r.top) / r.height) * 2 + 1,
          ),
          camera,
        );
        const hit = raycaster.intersectObject(object, true)[0];
        if (hit) {
          marker.position.copy(hit.point);
          marker.visible = true;
          latest.current.onPoint?.({
            type: "3d",
            point: hit.point.toArray(),
            camera: camera.position.toArray(),
            target: controls.target.toArray(),
            modelId: file.id,
          });
        }
      });
      function animate() {
        if (stop) return;
        frame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();
      S("");
      I({ meshes, triangles: Math.round(triangles) });
      if (anchor && anchor.modelId === file.id) {
        camera.position.fromArray(anchor.camera);
        controls.target.fromArray(anchor.target);
        marker.position.fromArray(anchor.point);
        marker.visible = true;
        controls.update();
      }
    })().catch((e) => {
      if (!stop) {
        clean();
        E(e.message || "模型解析失败，请使用图片预览或下载文件。");
        S("");
      }
    });
    return () => {
      stop = true;
      controller.abort();
      clean();
    };
  }, [file?.id]);
  useEffect(() => {
    const e = engine.current;
    if (e && anchor && anchor.modelId === file?.id) {
      e.camera.position.fromArray(anchor.camera);
      e.controls.target.fromArray(anchor.target);
      e.marker.position.fromArray(anchor.point);
      e.marker.visible = true;
      e.controls.update();
    }
  }, [focus?.id, file?.id]);
  return (
    <div className="model-viewer" onClick={(e) => e.stopPropagation()}>
      <div className="model-toolbar">
        <select
          aria-label="预览模型"
          value={file?.id || ""}
          onChange={(e) => C(+e.target.value)}
        >
          {models.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <button
          className={"btn " + (mark ? "primary" : "")}
          disabled={!!error || !info || readOnly}
          onClick={() => M(!mark)}
        >
          <Target size={14} />
          {mark ? "退出标注" : "位置标注"}
        </button>
        <button
          className="iconbtn"
          title="重置模型视角"
          onClick={() => engine.current?.reset()}
        >
          <RotateCcw size={16} />
        </button>
        <button
          className="iconbtn"
          title="切换线框"
          onClick={() => {
            const n = !wire;
            W(n);
            engine.current?.object.traverse((o) => {
              if (o.isMesh)
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                  (m) => {
                    m.wireframe = n;
                  },
                );
            });
          }}
        >
          <Grid2X2 size={16} />
        </button>
      </div>
      <div className="model-canvas" ref={host} aria-label="三维模型画布" />
      {status && <div className="model-loading">{status}</div>}
      {error && (
        <div className="model-failure" role="status">
          <AlertCircle />
          <p>{error}</p>
        </div>
      )}
      {info && (
        <div className="model-info">
          <span>
            {info.meshes} 网格 · {info.triangles.toLocaleString()} 三角面
          </span>
          <span>
            {mark ? "点击模型表面定位意见" : "拖动旋转 · 滚轮缩放 · 右键平移"}
          </span>
        </div>
      )}
    </div>
  );
}
