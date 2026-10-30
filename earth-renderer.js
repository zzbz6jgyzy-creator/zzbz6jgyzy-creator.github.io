/* Supercharged Daily Earth preview. Local Three.js r170 (MIT); optional dated satellite cloud texture. */
import * as THREE from '/vendor/three/three.module.min.js';
import {solarPosition, geoVector, vectorGeo, MIN_ORBIT_ALTITUDE_KM} from '/earth-live-model.js?v=20261030-time2';

const TAU = Math.PI * 2;
const EARTH_KM=6371,AU_KM=149597870.7,LY_KM=9460730472580.8;
const MAX_RANGE_KM=600000*LY_KM;
const CLOSE_DETAIL_ALTITUDE_KM=MIN_ORBIT_ALTITUDE_KM*2; // close-up detail upgrade starts at twice the floor altitude
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// Legacy Earth shaders: unchanged, shared with the isolated Starship replay (it supplies only uDay/uNight/uCloud/uSun/uCloudOffset).
const LEGACY_VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const LEGACY_SURFACE = `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uCloud;
  uniform vec3 uSun;
  uniform float uCloudOffset;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSun);
    float mu = dot(N, L);
    float facing = clamp(dot(N, V), 0.0, 1.0);
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float clouds = dot(texture2D(uCloud, vec2(vUv.x + uCloudOffset + 0.0014, vUv.y - 0.001)).rgb, vec3(0.3333));
    float cloudShadow = smoothstep(0.15, 0.78, clouds) * 0.16;
    float daylight = max(mu, 0.0);
    float nightSide = 1.0 - smoothstep(-0.16, 0.06, mu);
    vec3 ambient = vec3(0.003, 0.007, 0.015);
    vec3 sunlight = vec3(1.05, 1.005, 0.94);
    vec3 color = day * (ambient + sunlight * daylight * 1.18 * (1.0 - cloudShadow));
    // Exclude the cool land background in the Black Marble visual composite.
    float lightStrength = max(0.0, min(night.r, night.g) - night.b * 0.7);
    vec3 cityLights = pow(max(night, vec3(0.0)), vec3(0.88));
    cityLights *= smoothstep(0.008, 0.12, lightStrength);
    color += cityLights * vec3(1.13, 0.91, 0.68) * nightSide * 1.15;
    float ocean = 1.0 - smoothstep(0.55, 0.92, (day.r + day.g) / max(day.b * 2.0, 0.002));
    float specular = pow(max(dot(reflect(-L, N), V), 0.0), 130.0);
    float fresnel = 0.035 + 0.965 * pow(1.0 - facing, 5.0);
    color += vec3(1.0, 0.93, 0.78) * specular * ocean * (0.22 + fresnel) * daylight * 1.35;
    float limb = pow(1.0 - facing, 3.3);
    float sunwardHaze = smoothstep(-0.23, 0.45, mu);
    color += vec3(0.055, 0.21, 0.48) * limb * (0.05 + sunwardHaze * 0.4);
    color += vec3(0.32, 0.078, 0.012) * limb * exp(-abs(mu) * 18.0) * 0.35;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const LEGACY_CLOUDS = `
  uniform sampler2D uCloud;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    float coverage = dot(texture2D(uCloud, vUv).rgb, vec3(0.3333));
    coverage = smoothstep(0.1, 0.76, coverage);
    float mu = dot(N, normalize(uSun));
    float day = max(mu, 0.0);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);
    vec3 color = vec3(1.06, 1.035, 0.98) * (0.015 + day * 1.25);
    color += vec3(0.025, 0.065, 0.12) * rim * smoothstep(-0.16, 0.3, mu);
    float alpha = coverage * 0.84 * smoothstep(0.0, 0.11, dot(N, V));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const LEGACY_ATMOSPHERE = `
  uniform vec3 uSun;
  varying vec3 vWorldPosition;
  void main() {
    vec3 origin = cameraPosition;
    vec3 ray = normalize(vWorldPosition - origin);
    float b = dot(origin, ray);
    float disc = b * b - dot(origin, origin) + 1.071225;
    if (disc <= 0.0) discard;
    float nearT = max(0.0, -b - sqrt(disc));
    float farT = -b + sqrt(disc);
    float stepLength = (farT - nearT) / 8.0;
    vec3 light = normalize(uSun);
    vec3 scatter = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      vec3 p = origin + ray * (nearT + (float(i) + 0.5) * stepLength);
      float r = length(p);
      float height = clamp((r - 1.0) / 0.035, 0.0, 1.0);
      float density = exp(-height * 7.0);
      float mu = dot(p / r, light);
      float horizon = -sqrt(max(0.0, 1.0 - 1.0 / (r * r)));
      float sunVisible = smoothstep(horizon - 0.035, horizon + 0.025, mu);
      vec3 tint = mix(vec3(0.78, 0.23, 0.055), vec3(0.095, 0.32, 0.86), smoothstep(horizon + 0.015, horizon + 0.19, mu));
      scatter += tint * density * (sunVisible + 0.006) * stepLength;
    }
    float phase = 0.75 * (1.0 + pow(dot(ray, light), 2.0));
    gl_FragColor = vec4(scatter * phase * 4.1, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.a = clamp(max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)), 0.0, 1.0);
  }
`;

// ---- Physically based Earth (mission-control explorer). Units: Earth radius = 1. ----
const PBR_VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vEast;
  varying vec3 vNorth;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPosition = world.xyz;
    mat3 m = mat3(modelMatrix);
    vWorldNormal = normalize(m * normal);
    // Unit-sphere tangents in the texture's own frame: east = +u, north = +v.
    vEast = m * normalize(vec3(position.z, 0.0, -position.x) + vec3(1e-5, 0.0, 0.0));
    vNorth = m * normalize(vec3(-position.x * position.y, position.x * position.x + position.z * position.z, -position.z * position.y) + vec3(0.0, 1e-5, 0.0));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
// Single scattering (O'Neil, GPU Gems 2 ch.16): Rayleigh + Mie, exponential density, optical depth to the Sun
// from the Chapman function (closed form, no inner loop), midpoint view-ray integral. The scale heights are
// exaggerated (about 4x Rayleigh, 6x Mie) so the limb reads at screen scale; vertical optical depths are physical.
const ATMO_COMMON = `
  #define PI 3.14159265
  const float HR = 0.005;
  const float HM = 0.0012;
  const float ATM_TOP = 1.062;
  const vec3 TAU_R = vec3(0.0464, 0.1080, 0.2650);
  const float TAU_M = 0.022;
  const float TAU_M_EXT = 0.025;
  const float MIE_G = 0.76;
  const float SUN_E = 1.25;
  // Sun path: real planet curvature (scale height 8 km = 0.001256 Earth radii) so the horizon path is twice as long as in the
  // exaggerated atmosphere, with the exaggerated density profile above the ground. Zenith optical depth is unchanged.
  const float X_SUN = 796.0;
  float chPos(float X, float h, float cz) {
    float c = sqrt(1.5707963 * (X + h));
    float x = c * cz, s4 = sqrt(sqrt(x));
    return exp(-h) / (cz + (1.0 / c) / (1.0 + 0.337 * x * s4 * sqrt(s4)));
  }
  // Optical depth multiplier along a ray leaving radius r at zenith cosine cz (Chapman function, within 3% of numeric integration).
  float chapman(float X, float h, float cz) {
    if (cz >= 0.0) return chPos(X, h, cz);
    float x0 = sqrt(1.0 - cz * cz) * (X + h);
    return 2.0 * sqrt(1.5707963 * x0) * exp(X - x0) - chPos(X, h, -cz);
  }
  vec3 opticalDepth(float r, float cz, float X) {
    float h = max(r - 1.0, 0.0);
    return TAU_R * chapman(X, h / HR, cz) + vec3(TAU_M_EXT * chapman(1.0 / HM, h / HM, cz));
  }
  // Sun visibility (1 in daylight, fading to 0 once the planet blocks the Sun at this height).
  float sunVisibility(float r, float cz) {
    if (cz >= 0.0) return 1.0;
    return smoothstep(-0.004, 0.0, sqrt(max(1.0 - cz * cz, 0.0)) * r - 1.0);
  }
  vec3 sunTransmittance(float r, float cz) {
    float vis = sunVisibility(r, cz);
    if (vis <= 0.0) return vec3(0.0);
    return exp(-opticalDepth(r, cz, X_SUN)) * vis;
  }
  // Multiple scattering refills the blue that single scattering removes along long paths; view-path extinction is scaled by MS.
  const float MS = 0.6;
  vec3 viewTransmittance(float r, float cv) { return exp(-MS * opticalDepth(r, max(cv, 0.0), 1.0 / HR)); }
  // Single-scattered light along a view ray (camera ro, direction rd) to the atmosphere exit or the planet.
  // status: -1 misses the atmosphere, 0 limb ray, 1 hits the planet.
  vec3 atmosphereScatter(vec3 ro, vec3 rd, vec3 L, float steps, out float status) {
    status = -1.0;
    float b = dot(ro, rd);
    float cc = dot(ro, ro);
    float disc = b * b - cc + ATM_TOP * ATM_TOP;
    if (disc <= 0.0) return vec3(0.0);
    float sd = sqrt(disc);
    float t0 = max(0.0, -b - sd);
    float t1 = -b + sd;
    float dp = b * b - cc + 1.0;
    bool hit = false;
    if (dp > 0.0) { float tp = -b - sqrt(dp); if (tp > 0.0) { t1 = min(t1, tp); hit = true; } }
    status = hit ? 1.0 : 0.0;
    // Grazing rays that end on the planet keep the full step count so they match the limb shell without a seam.
    float n = hit && (cc - b * b) > 1.1 ? min(steps, 3.0) : steps;
    float odR = 0.0, odM = 0.0;
    vec3 sumR = vec3(0.0), sumM = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      if (float(i) >= n) break;
      float ua = float(i) / n, ub = (float(i) + 1.0) / n, um = 0.5 * (ua + ub);
      float ta, tb, tm;
      if (hit) {
        // Samples crowd towards the ground, where the air is densest.
        ta = t0 + (t1 - t0) * (1.0 - (1.0 - ua) * (1.0 - ua));
        tb = t0 + (t1 - t0) * (1.0 - (1.0 - ub) * (1.0 - ub));
        tm = t0 + (t1 - t0) * (1.0 - (1.0 - um) * (1.0 - um));
      } else {
        // Limb rays: samples crowd around the tangent point.
        float wa = 2.0 * ua - 1.0, wb = 2.0 * ub - 1.0, wm = 2.0 * um - 1.0;
        ta = max(-b + sd * sign(wa) * wa * wa, t0);
        tb = max(-b + sd * sign(wb) * wb * wb, t0);
        tm = max(-b + sd * sign(wm) * wm * wm, t0);
      }
      float dt = tb - ta;
      vec3 p = ro + rd * tm;
      float r = length(p);
      float h = max(r - 1.0, 0.0);
      float dR = exp(-h / HR), dM = exp(-h / HM);
      odR += 0.5 * dR * dt; odM += 0.5 * dM * dt;
      float cz = dot(p, L) / r;
      float vis = sunVisibility(r, cz);
      if (vis > 0.0) {
        vec3 T = vis * exp(-(opticalDepth(r, cz, X_SUN) + MS * (TAU_R / HR * odR + vec3(TAU_M_EXT / HM) * odM)));
        sumR += dR * dt * T; sumM += dM * dt * T;
      }
      odR += 0.5 * dR * dt; odM += 0.5 * dM * dt;
    }
    float mu = dot(rd, L);
    float pr = 0.75 * (1.0 + mu * mu);
    float g2 = MIE_G * MIE_G;
    float pm = 1.5 * (1.0 - g2) / (2.0 + g2) * (1.0 + mu * mu) / pow(1.0 + g2 - 2.0 * MIE_G * mu, 1.5);
    return SUN_E * 0.2 * (TAU_R / HR * pr * sumR + vec3(TAU_M / HM) * pm * sumM);
  }
  float hgNorm(float c, float g) { return (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * c, 1.5); }
`;
const CLOUD_COMMON = `
  uniform sampler2D uCloud;
  uniform float uObservedCloud;
  uniform float uCloudIR;
  uniform float uDetail;
  float hash21(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // Quintic-smoothed bilinear sample: removes the diamond/blocky bilinear artefacts of a 2K source at close range.
  vec4 texSmooth(sampler2D t, vec2 uv, vec2 gx, vec2 gy) {
    vec2 sz = vec2(textureSize(t, 0));
    vec2 p = uv * sz - 0.5;
    vec2 i = floor(p);
    vec2 f = p - i;
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return textureGrad(t, (i + 0.5 + f) / sz, gx, gy);
  }
  // cov: opacity proxy. rel: unsaturated brightness of the source (cold = high), used only for relief shading.
  void cloudSample(vec2 uv, vec2 gx, vec2 gy, float detail, out float cov, out float rel) {
    float c = dot(texSmooth(uCloud, uv, gx, gy).rgb, vec3(0.3333));
    rel = smoothstep(0.15, 0.95, c);
    c = mix(c, smoothstep(0.24, 0.74, c), uCloudIR);
    float ill = smoothstep(0.1, 0.76, c);
    float obs = pow(smoothstep(0.08, 0.98, c), 1.65) * (1.0 - smoothstep(0.35, 0.375, abs(uv.y - 0.5)));
    cov = mix(ill, obs, uObservedCloud);
    if (detail > 0.5) {
      // Sub-texel edge breakup only; it adds no cloud where the data has none.
      float cl = max(sin(uv.y * PI), 0.12);
      vec2 q = vec2(uv.x * cl * 2048.0, uv.y * 1024.0);
      float n = vnoise(q) * 0.6 + vnoise(q * 2.3 + 7.1) * 0.4 - 0.5;
      cov = clamp(cov + n * 0.34 * cov * (1.0 - cov) * 4.0, 0.0, 1.0);
    }
  }
`;
const PBR_SURFACE = `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uNormalMap;
  uniform sampler2D uOceanMap;
  uniform vec3 uSun;
  uniform float uCloudOffset;
  uniform float uRelief;
  uniform float uOceanReady;
  uniform float uSteps;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vEast;
  varying vec3 vNorth;
  ${ATMO_COMMON}
  ${CLOUD_COMMON}
  void main() {
    vec3 Ng = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSun);
    vec3 E = normalize(vEast), Nt = normalize(vNorth);
    vec3 d = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
    d.xy *= 0.32; d.z = max(d.z, 0.1);
    vec3 N = normalize(mix(Ng, mat3(E, Nt, Ng) * normalize(d), uRelief));
    float mu = dot(Ng, L);
    float muD = dot(N, L);
    float NV = max(dot(Ng, V), 0.0);
    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 Tsun = sunTransmittance(1.0, mu);
    // Cloud shadow: ray from the surface to the Sun meets the cloud shell at height 0.009 after path t (parallax, not a fixed offset).
    vec3 Lt = L - Ng * mu;
    float tShadow = min(-mu + sqrt(mu * mu + 0.018081), 0.3);
    float cl = max(sin(vUv.y * PI), 0.1);
    vec2 suv = vUv + vec2(uCloudOffset + dot(Lt, E) * tShadow / (6.2831853 * cl), dot(Lt, Nt) * tShadow / PI);
    vec2 gx = dFdx(vUv), gy = dFdy(vUv);
    float cover = 0.0, rel0;
    if (mu > -0.1) cloudSample(suv, gx, gy, 0.0, cover, rel0);
    float shadow = 1.0 - 0.6 * smoothstep(0.12, 0.85, cover);
    float ocean = 1.0 - smoothstep(0.55, 0.92, (day.r + day.g) / max(day.b * 2.0, 0.002));
    ocean = mix(ocean, texture2D(uOceanMap, vUv).r, uOceanReady);
    vec3 albedo = day;
    // Direct sun through the atmosphere, plus blue sky fill that fades through astronomical twilight.
    float skyLight = smoothstep(-0.31, 0.3, mu);
    // Sky fill is blue by day and warms (towards the reddened sun) in the narrow band around sunset.
    float warm = smoothstep(-0.10, -0.02, mu) * (1.0 - smoothstep(0.02, 0.14, mu));
    vec3 sky = mix(vec3(0.42, 0.62, 1.0), vec3(1.0, 0.55, 0.32), warm) * 0.08 * skyLight * skyLight;
    vec3 color = albedo * SUN_E * (Tsun * max(muD, 0.0) * shadow + sky);
    // Ocean sun glint: Cox-Munk style Beckmann slope distribution (wind-roughened sea, m2 = 0.003 + 0.00512 U, U about 3 m/s),
    // Schlick Fresnel, flat geometric normal. Gain and soft peak clamp are artistic: the patch is broad with a defined edge.
    vec3 H = normalize(L + V);
    float NL = max(mu, 0.0), NH = max(dot(Ng, H), 1e-3), VH = max(dot(V, H), 0.0), nv = max(NV, 0.02);
    float m2 = 0.005;
    float t2 = (1.0 - NH * NH) / (NH * NH);
    float D = exp(-t2 / m2) / (PI * m2 * NH * NH * NH * NH);
    float F = 0.02 + 0.98 * pow(1.0 - VH, 5.0);
    float va = 0.2, va2 = va * va;
    float vis = 0.5 / (NL * sqrt(nv * nv * (1.0 - va2) + va2) + nv * sqrt(NL * NL * (1.0 - va2) + va2) + 1e-4);
    float glint = D * F * vis * NL * PI * SUN_E * 0.7;
    glint = 3.0 * (1.0 - exp(-glint / 3.0));
    if (ocean > 0.01 && NL > 0.0) color += Tsun * glint * ocean * shadow;
    // Artistic water-leaving radiance: the source ocean texture is nearly black, real seawater scatters a little blue-green light.
    color += vec3(0.010, 0.032, 0.070) * SUN_E * Tsun * max(muD, 0.0) * ocean * shadow;
    // Sky reflected at grazing angles (artistic colour and gain).
    float Fv = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
    color += vec3(0.05, 0.10, 0.20) * Fv * ocean * skyLight;
    // City lights: none until the Sun is 6 degrees below the horizon (civil twilight), full by 18 degrees.
    float dark = (1.0 - smoothstep(-0.2079, -0.1045, mu)) * (0.5 + 0.5 * (1.0 - smoothstep(-0.309, -0.2079, mu)));
    if (dark > 0.0) {
      vec3 night = texture2D(uNight, vUv).rgb;
      float lightStrength = max(0.0, min(night.r, night.g) - night.b * 0.7);
      vec3 lights = pow(max(night, vec3(0.0)), vec3(0.88)) * smoothstep(0.008, 0.12, lightStrength);
      vec3 halo = textureGrad(uNight, vUv, gx * 11.3, gy * 11.3).rgb;
      halo *= smoothstep(0.004, 0.06, max(0.0, min(halo.r, halo.g) - halo.b * 0.7));
      color += (lights + halo * 0.3) * vec3(1.0, 0.76, 0.48) * dark * 1.45; // clouds above already hide lights through their own alpha
    }
    // Aerial perspective in linear light, before tone mapping: surface seen through the air, plus the air's own in-scatter.
    float status;
    vec3 hazeIn = atmosphereScatter(cameraPosition, -V, L, uSteps, status);
    color = color * viewTransmittance(1.0, NV) + hazeIn;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const PBR_CLOUDS = `
  uniform vec3 uSun;
  uniform float uSteps;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vEast;
  varying vec3 vNorth;
  ${ATMO_COMMON}
  ${CLOUD_COMMON}
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPosition);
    vec3 L = normalize(uSun);
    vec3 E = normalize(vEast), Nt = normalize(vNorth);
    float mu = dot(N, L);
    vec2 gx = dFdx(vUv), gy = dFdy(vUv);
    float cov, rel;
    cloudSample(vUv, gx, gy, uDetail, cov, rel);
    if (cov < 0.004) discard;
    // Relief: compare coverage with a sample towards the Sun (thicker upsun = shaded, thinner = lit).
    vec3 Lt = L - N * mu;
    float cl = max(sin(vUv.y * PI), 0.1);
    vec2 off = vec2(dot(Lt, E) / (6.2831853 * cl), dot(Lt, Nt) / PI) * 0.02;
    float shade = 1.0;
    if (uDetail > 0.5) { float c2, r2; cloudSample(vUv + off, gx, gy, 0.0, c2, r2); shade = clamp((0.8 + 0.25 * rel) * (1.0 + 2.6 * (rel - r2)) * (1.0 + 1.2 * (cov - c2)), 0.45, 1.3); }
    vec3 Tsun = sunTransmittance(1.009, mu);
    // Front-loaded ramp: cloud tops stay lit (and turn orange-pink through the reddened path) after the ground terminator.
    float lit = smoothstep(-0.12, 0.25, mu);
    float cs = -dot(V, L); // scattering angle cosine seen from the camera (1 = looking at the Sun through the cloud)
    float phase = mix(1.0, hgNorm(-cs, 0.62), 0.32) / 0.78;
    vec3 color = Tsun * SUN_E * 0.95 * lit * phase * shade;
    // Silver lining: thin cloud edges transmit forward-scattered light near the terminator.
    float thin = (1.0 - cov) * (1.0 - cov);
    color += Tsun * SUN_E * 0.5 * thin * smoothstep(-0.3, 0.2, mu) * (1.0 - smoothstep(0.1, 0.5, mu)) * hgNorm(-cs, 0.7) * 0.06;
    float skyLight = smoothstep(-0.31, 0.3, mu);
    float warm = smoothstep(-0.10, -0.02, mu) * (1.0 - smoothstep(0.02, 0.14, mu));
    color += mix(vec3(0.42, 0.62, 1.0), vec3(1.0, 0.55, 0.32), warm) * 0.1 * skyLight * skyLight + vec3(0.004, 0.006, 0.012);
    float status;
    vec3 hazeIn = atmosphereScatter(cameraPosition, -V, L, min(uSteps, 2.0), status);
    color = color * viewTransmittance(1.009, dot(N, V)) + hazeIn;
    float alpha = cov * 0.9 * smoothstep(0.0, 0.11, dot(N, V));
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
const PBR_ATMOSPHERE = `
  uniform vec3 uSun;
  uniform float uSteps;
  varying vec3 vWorldPosition;
  ${ATMO_COMMON}
  void main() {
    // The shell only draws the limb glow beyond the disc. In-scatter over the planet is added inside the surface and cloud
    // shaders before tone mapping, so the haze is summed in linear light.
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPosition - ro);
    // Cheap reject first: rays that end on the planet are shaded in the surface and cloud passes.
    float bb = dot(ro, rd), dd = bb * bb - dot(ro, ro) + 1.0;
    if (dd > 0.0 && -bb - sqrt(dd) > 0.0) discard;
    float status;
    vec3 col = atmosphereScatter(ro, rd, normalize(uSun), uSteps, status);
    if (status != 0.0) discard;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.a = clamp(max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)), 0.0, 1.0);
  }
`;

// The Starship replay keeps the legacy look: it only supplies the five basic uniforms.
export const earthShaders = Object.freeze({ vertex: LEGACY_VERTEX, surface: LEGACY_SURFACE, clouds: LEGACY_CLOUDS, atmosphere: LEGACY_ATMOSPHERE });
// Physically based shaders used by the mission-control explorer.
export const earthShadersPhysical = Object.freeze({ vertex: PBR_VERTEX, surface: PBR_SURFACE, clouds: PBR_CLOUDS, atmosphere: PBR_ATMOSPHERE });


/**
 * @param {{canvas:HTMLCanvasElement, textureBase?:string, quality?:string,
 * onStatus?:(message:string)=>void, onReady?:(viewer:object)=>void,
 * onError?:(error:Error)=>void, onChange?:(state:object)=>void}} options
 */
export async function initEarth(options = {}) {
  const Flight = await import('/earth-flight.js?v=20261030-time2'); // loaded here so the Starship replay, which only needs the shaders, never downloads it
  const Time = await import('/earth-time.js?v=20261030-time2');
  const clock = Time.createClock();
  const { canvas, onStatus = () => {}, onReady = () => {}, onError = () => {}, onChange = () => {} } = options;
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('An Earth canvas is required.');
  const textureBase = (options.textureBase || '/assets/earth').replace(/\/$/, '');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (error) {
    onError(error);
    throw error;
  }
  renderer.setClearColor(0x030509, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.debug.onShaderError = () => { throw new Error('The Earth graphics could not start on this device.'); };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
  const globe = new THREE.Group();
  globe.rotation.y = -1.92;
  globe.rotation.z = -0.07;
  scene.add(globe);
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  black.needsUpdate = true;
  const sun = new THREE.Vector3(-0.92, 0.28, 0.43).normalize();
  const targetSun = sun.clone();
  const uniforms = { uDay: { value: black }, uNight: { value: black }, uCloud: { value: black }, uSun: { value: sun }, uCloudOffset: { value: 0 }, uObservedCloud: { value: 0 },uCloudIR:{value:0}, uNormalMap:{value:black},uOceanMap:{value:black},uRelief:{value:0},uOceanReady:{value:0},uDetail:{value:0},uSteps:{value:6} };
  const sphere = new THREE.SphereGeometry(1, 160, 112);
  const surface = new THREE.Mesh(sphere, new THREE.ShaderMaterial({ vertexShader: PBR_VERTEX, fragmentShader: PBR_SURFACE, uniforms }));
  globe.add(surface);
  const cloudMaterial = new THREE.ShaderMaterial({ vertexShader: PBR_VERTEX, fragmentShader: PBR_CLOUDS, uniforms: { uCloud: uniforms.uCloud, uSun: uniforms.uSun, uObservedCloud: uniforms.uObservedCloud,uCloudIR:uniforms.uCloudIR,uDetail:uniforms.uDetail,uSteps:uniforms.uSteps }, transparent: true, depthWrite: false });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.009, 144, 96), cloudMaterial);
  clouds.renderOrder = 2;
  globe.add(clouds);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.08, 112, 80), new THREE.ShaderMaterial({ vertexShader: PBR_VERTEX, fragmentShader: PBR_ATMOSPHERE, uniforms: { uSun: uniforms.uSun, uSteps: uniforms.uSteps }, transparent: true, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.FrontSide, depthWrite: false }));
  atmosphere.renderOrder = 3;
  scene.add(atmosphere);

  let seed = 14419;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const starPositions = [], starSizes = [], starColors = [];
  for (let i = 0; i < 840; i++) {
    const azimuth = random() * TAU, z = random() * 2 - 1, r = Math.sqrt(1 - z * z), brightness = 0.12 + Math.pow(random(), 3) * 0.55;
    starPositions.push(48 * r * Math.cos(azimuth), 48 * z, 48 * r * Math.sin(azimuth));
    starSizes.push(0.7 + random() * 1.1);
    starColors.push(brightness * 0.8, brightness * 0.89, brightness);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(starSizes, 1));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } }, transparent: true, depthWrite: false, vertexColors: true,
    vertexShader: 'attribute float aSize; uniform float uPixelRatio; varying vec3 vColor; void main(){vColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=aSize*uPixelRatio;}',
    fragmentShader: 'varying vec3 vColor; void main(){float d=length(gl_PointCoord-vec2(0.5));if(d>0.5)discard;gl_FragColor=vec4(vColor,1.0-smoothstep(0.12,0.5,d));#include <colorspace_fragment>}',
  });
  // Shader includes must start on their own line.
  starMaterial.fragmentShader = starMaterial.fragmentShader.replace('#include', '\n#include').replace('>}', '>\n}');
  const fallbackStars=new THREE.Points(starGeometry,starMaterial);scene.add(fallbackStars);

  const maps = { day: null, night: null, clouds: null, normal:null, ocean:null };
  let cosmos=null,cosmosPromise=null,cosmicState=null,deepSky=false;
  // Camera: earth-flight.js owns position, orientation, inertia, modes and the autopilot. This file turns its state into a camera.
  const flight=Flight.createFlight({earthFloor:EARTH_KM+MIN_ORBIT_ALTITUDE_KM});
  const focusId=()=>flight.state.anchor, travelling=()=>flight.state.mode==='auto';
  const orbitTmp=new Float64Array(4),camKm=new Float64Array(3),sunPos=new Float64Array(3);
  let flightPlaced=false;
  const cameraOrbit=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.10,0,0,'YXZ'));
  // Open on a naturally illuminated three-quarter Earth without changing geographic sunlight.
  if(options.view==='live'){
    const p=solarPosition(clock.ms()),point=geoVector(clamp(p.lat*.5,-18,18),p.lon+38);
    const direction=new THREE.Vector3(point.x,point.y,point.z).applyQuaternion(globe.quaternion);
    const north=new THREE.Vector3(0,1,0).applyQuaternion(globe.quaternion);
    cameraOrbit.setFromRotationMatrix(new THREE.Matrix4().lookAt(direction,new THREE.Vector3(),north));
  }
  const initialOrbit=cameraOrbit.clone();
  let rightDown=false,dragOrbit=null,dragVector=null,lookDrag=false,lastLook=null,pad0=null;const spinAxis=new THREE.Vector3(),rayDir=new THREE.Vector3(),hitDir=new Float64Array(3);
  let observedCloud = null, weatherToken = 0, weatherAt = null, selectedPoint = null;
  const marker = new THREE.Mesh(new THREE.SphereGeometry(.007, 16, 12),new THREE.MeshBasicMaterial({color:0xf34765}));
  marker.visible = false; marker.renderOrder = 4; globe.add(marker);
  const raycaster = new THREE.Raycaster();
  let gestureStart = null, gestureMoved = false;
  function updateLiveSun() {
    if (currentView !== 'live') return;
    const position = solarPosition(clock.ms());
    const direction = geoVector(position.lat, position.lon);
    globe.updateMatrixWorld(true);
    sun.set(direction.x,direction.y,direction.z).applyQuaternion(globe.quaternion).normalize();
    targetSun.copy(sun);
  }
  function snapSun() { updateLiveSun(); sun.copy(targetSun); }

  const pointers = new Map();
  let width = 1, height = 1, fitDistance = 3.3, yaw = 0, pitch = 0.10;
  const zoomNow = () => fitDistance * EARTH_KM / flight.distance();
  let targetYaw = yaw, targetPitch = pitch, cloudAngle = 0, pinchDistance = 0;
  flight.setAnimated(!motion.matches);
  let paused = motion.matches, visible = true, disposed = false, contextLost = false, ready = false;
  let quality = ['auto', 'high', 'ultra', 'studio'].includes(options.quality) ? options.quality : 'auto';
  let lastFlight = 0, qualityToken = 0, frames = 0, raf = 0, lastTime = 0, lastRender = 0, interactionUntil = 0;
  let currentView = options.view === 'live' ? 'live' : 'sunrise', appliedTier = '2k', detailMessage = '';
  const maxTexture = renderer.capabilities.maxTextureSize;
  const cleanups = [];
  const bind = (target, type, handler, opts) => { target.addEventListener(type, handler, opts); cleanups.push(() => target.removeEventListener(type, handler, opts)); };
  const running = () => ready && (!paused || travelling() || clock.moving()) && visible && !document.hidden && !disposed && !contextLost;
  const notify = () => { if (!disposed) onChange(getState()); };

  function getState() {
    return { ready, frames, running: running(), paused, reducedMotion: motion.matches, quality, view: currentView, rotation: globe.rotation.y, zoom: zoomNow(), cameraYaw: yaw, cameraPitch: pitch, textureCount: Object.values(maps).filter(Boolean).length, textureWidth: maps.day?.image?.width || 0, textureTier: appliedTier.toUpperCase(), maxTextureSize: maxTexture, contextLost, detailMessage, orbitQuaternion:Array.from(flight.orbitQuaternion()), cameraUp:camera.up.toArray(), distanceKm:flight.distance(), scene:cosmicState?.level||'earth', focus:focusId(),travelling:travelling(), flight:flightInfo(), cameraKm:Array.from(flight.worldOf(camKm)),cosmos:cosmos?.getState()||null, studioSupported:maxTexture>=16384&&navigator.deviceMemory>=8&&innerWidth>=1100, relief:uniforms.uRelief.value>0, skyReady:cosmicState?.skyReady||false, sun:solarPosition(clock.ms()), time:clock.getState(), weatherAt,cloudKind:uniforms.uCloudIR.value?'infrared':'illustrative',observedCloud:!!observedCloud, selectedPoint };
  }
  function flightInfo(){
    const f=flight.state;
    return {mode:f.mode==='auto'?'autopilot':f.mode, anchor:f.anchor, nearest:f.nearestId, altitudeKm:f.altitude, cruiseKmS:f.cruise, speedMult:f.speedMult, offer:f.offer, autopilot:f.auto?f.auto.target:null, progress:f.auto?clamp(f.auto.t,0,1):0, speedText:Flight.formatSpeed(f.cruise), path:!!f.path, floorKm:flight.floorOf(f.anchor)||0};
  }
  function updateCamera() {
    flight.measure();
    const fs=flight.state, distanceKm=flight.distance();
    const estimateUnit=distanceKm<2e7?EARTH_KM:distanceKm<LY_KM*.08?AU_KM:distanceKm<LY_KM*800?LY_KM:LY_KM*3261.563777;
    const distance=distanceKm/estimateUnit;
    if(!closeSeen&&focusId()==='Earth'&&distanceKm-EARTH_KM<CLOSE_DETAIL_ALTITUDE_KM&&ready){closeSeen=true;if(quality==='auto'&&tierFor('auto')!==appliedTier)void setQuality('auto');}
    // Keep the selection marker the same angular size when the camera is close (it is 45 km wide at scale 1).
    marker.scale.setScalar(estimateUnit===EARTH_KM?clamp((distance-1)/2.3,.03,1):1);
    camera.position.set(fs.off[0]/estimateUnit,fs.off[1]/estimateUnit,fs.off[2]/estimateUnit);
    camera.quaternion.set(fs.q[0],fs.q[1],fs.q[2],fs.q[3]);
    camera.up.set(0,1,0).applyQuaternion(camera.quaternion);
    yaw=Math.atan2(fs.off[0],fs.off[2]);pitch=Math.asin(clamp(fs.off[1]/(distanceKm||1),-1,1));
    camera.updateMatrixWorld();
    if(cosmos){if(cosmos.getFocus()!==fs.anchor)cosmos.setFocus(fs.anchor);// Star, sky and galaxy fades follow the distance to the Sun in free flight and autopilot, so they stay continuous when the anchor changes.
      let fadeKm=distanceKm;if(fs.mode!=='orbit'){const sun=flight.bodyOf('Sun');if(sun){flight.worldOf(camKm);fadeKm=Math.hypot(camKm[0]-sun.pos[0],camKm[1]-sun.pos[1],camKm[2]-sun.pos[2]);}}
      cosmicState=cosmos.update({distanceKm,nearKm:Math.max(fs.altitude,1e-3),blend:fs.mode==='orbit',live:fs.mode!=='orbit'||flight.active()||clock.moving(),fadeKm,date:clock.date(),simulated:!clock.isLive()});fallbackStars.visible=!cosmicState?.skyReady;}
    else {camera.near=clamp((distance-1)*.4,.002,.1);camera.far=Math.max(150,distance*100);camera.updateProjectionMatrix();}
  }
  async function ensureCosmos(){
    if(cosmos)return cosmos;if(cosmosPromise)return cosmosPromise;
    cosmosPromise=import('/earth-cosmos.js?v=20261030-time2').then(m=>m.installCosmos({scene,camera,globe,clouds,atmosphere,renderer,
      onLabels:rows=>options.onLabels?.(rows),onStatus:message=>{if(!disposed){onStatus(message);renderDemand();}}
    })).then(world=>{if(disposed){world.dispose();return null;}cosmos=world;flight.setBodies(world.bodyList());flight.setPositionProvider(world.scenePosition);cosmos.setFocus(focusId());cosmos.setDeepSky(deepSky);renderDemand();return world;}).catch(()=>{cosmosPromise=null;detailMessage='The wider view could not load. Earth is still available.';flight.setBodies([{id:'Earth',radius:EARTH_KM}]);flight.jump({anchor:'Earth',distance:Math.min(flight.distance(),fitDistance*EARTH_KM/.65)});renderDemand();return null;});
    return cosmosPromise;
  }
  // Fly to a world or a scale preset on the autopilot's curved path. Body ids and the presets earth/moon/solar/galaxy are accepted.
  async function setScale(id){
    const world=await ensureCosmos();if(!world||disposed)return;
    const model=await import('/earth-cosmos-model.js?v=20261030-time2');
    if(id==='Earth')id='earth';
    const preset=model.scalePreset(id,fitDistance);
    const q=id==='earth'?initialOrbit:world.recommendedOrbit(id==='galaxy');
    world.prepare(preset.focus);
    flight.setAnimated(!paused&&!motion.matches);
    flight.flyTo(preset.focus,{distance:preset.distance,q:q.toArray(),onDone:()=>{renderDemand();notify();}});
    interactionUntil=performance.now()+10000;setView('live');schedule();renderDemand();notify();
  }
  function setDeepSky(value){deepSky=!!value;cosmos?.setDeepSky(deepSky);renderDemand();}
  function draw() {
    if (!ready || disposed || contextLost || !visible || document.hidden) return;
    updateCamera();
    updateLiveSun();
    renderer.render(scene, camera);cosmos?.labels();
    frames++;if(cosmicState&&frames%10===0)notify();
  }
  function frame(now) {
    raf = 0;
    if (!running()) return;
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;
    const rate=pointers.size||flight.active()?60:30;
    if (now - lastRender >= 1000 / rate - 0.5) {
      const dt = lastRender ? Math.min((now - lastRender) / 1000, 0.12) : elapsed;
      lastRender = now;
      clock.tick();
      if (!paused || travelling()) {
        // The camera runs on wall-clock time (capped at a quarter second), so a slow frame never stretches an autopilot trip.
        flight.step(lastFlight?Math.min((now-lastFlight)/1000,.25):dt);lastFlight=now;
        if (!paused&&flight.state.mode==='orbit'&&currentView!=='custom'&&now > interactionUntil&&!pointers.size&&!flight.active()){spinAxis.set(0,1,0).applyQuaternion(globe.quaternion);flight.spinOrbit(spinAxis.x,spinAxis.y,spinAxis.z,-dt*.012);}
      } else lastFlight = now;
      if (clock.moving() && Math.abs(clock.speed()) > 1) sun.copy(targetSun);
      else sun.lerp(targetSun, 1 - Math.exp(-dt * 4)).normalize();
      if (!observedCloud && currentView !== 'live' && currentView !== 'custom') cloudAngle += dt * 0.0024;
      clouds.rotation.y = cloudAngle;
      uniforms.uCloudOffset.value = -cloudAngle / TAU;
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    if (running() && !raf) { lastTime = 0; lastRender = 0; lastFlight = 0; raf = requestAnimationFrame(frame); }
    else if (!running() && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  // Input bursts (wheel, pinch, key repeat) can arrive faster than a frame; the close-up globe fills the screen, so a
  // synchronous full render per event is wasteful. Coalesce to one draw per animation frame.
  let demandFrame = 0;
  function renderDemand() {
    if(paused)sun.copy(targetSun);
    schedule();
    if(demandFrame||disposed)return;
    demandFrame=requestAnimationFrame(()=>{demandFrame=0;if(disposed)return;draw();notify();});
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
    const compact = width / height < 1.1, previousFit = fitDistance;
    const ultraBudget = (quality === 'ultra'||quality === 'studio') && !(navigator.deviceMemory && navigator.deviceMemory <= 4);
    const maxPixels = compact ? 2400000 : ultraBudget ? 8300000 : 4200000;
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(maxPixels / (width * height)));
    renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
    starMaterial.uniforms.uPixelRatio.value = dpr;
    camera.aspect = width / height;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    fitDistance = 1 / Math.sin(Math.min(verticalFov, horizontalFov) * (compact ? 0.98 : 0.80) / 2);
    if (!flightPlaced) { flightPlaced = true; flight.jump({ anchor: 'Earth', distance: fitDistance * EARTH_KM, q: cameraOrbit.toArray() }); }
    else if (previousFit !== fitDistance && flight.state.mode === 'orbit') flight.scaleDistance(fitDistance / previousFit);
    camera.setViewOffset(width, height, 0, 0, width, height);
    camera.updateProjectionMatrix();
    if(paused)sun.copy(targetSun);
    schedule(); draw(); notify(); // resizing clears the canvas, so redraw now (no deferred draw)
  }
  function loadTexture(file, color = true) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => { settled = true; reject(new Error('Earth imagery took too long to load.')); }, 18000);
      new THREE.TextureLoader().load(file.startsWith('/')?file:textureBase + '/' + file, texture => {
        if (settled || disposed) { texture.dispose(); if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Earth view closed.')); } return; }
        settled = true; clearTimeout(timer);
        texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        resolve(texture);
      }, undefined, () => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error('Earth imagery could not load.')); } });
    });
  }
  function applyMap(key, map) {
    const previous = maps[key]; maps[key] = map;
    if (key !== 'clouds' || !observedCloud) uniforms[{ day: 'uDay', night: 'uNight', clouds: 'uCloud', normal:'uNormalMap',ocean:'uOceanMap' }[key]].value = map;
    if(key==='normal')uniforms.uRelief.value=1;if(key==='ocean')uniforms.uOceanReady.value=1;
    previous?.dispose();
  }
  // Quality tiers: atmosphere integration steps and cloud/relief detail follow the texture tier (2K is the low tier).
  function shadeForTier() { uniforms.uSteps.value = { '2k': 4, '4k': 6, '8k': 10, '16k': 10 }[appliedTier] || 6; uniforms.uDetail.value = appliedTier === '2k' ? 0 : 1; }
  // Auto asks for the sharpest tier the device allows once the camera is close (below ~3,000 km), so the floor view is never 2K.
  let closeSeen = false;
  function tierFor(requested) {
    const saving = navigator.connection?.saveData;
    if (requested === 'auto' && closeSeen && !saving) requested = (width < 800 || (navigator.deviceMemory && navigator.deviceMemory <= 4)) ? 'high' : 'ultra'; // phones: 4K, not 8K
    const mobile = width < 800 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    if(requested==='studio'&&maxTexture>=16384&&navigator.deviceMemory>=8&&innerWidth>=1100)return'16k';
    if ((requested === 'ultra'||requested === 'studio') && maxTexture >= 8192 && !(navigator.deviceMemory && navigator.deviceMemory <= 4)) return '8k';
    if (maxTexture >= 4096 && (requested !== 'auto' || (!saving && !mobile))) return '4k';
    return '2k';
  }
  async function setQuality(requested = 'auto') {
    if (!['auto', 'high', 'ultra','studio'].includes(requested) || disposed) return getState();
    quality = requested;
    const token = ++qualityToken, tier = tierFor(requested);
    const detail=tier==='16k'?'8k':tier==='8k'?'4k':'2k';
    const detailWidth = detail==='8k'?8192:detail === '4k' ? 4096 : 2048;
    detailMessage=requested==='studio'&&tier!=='16k'?'16K detail needs a large screen, 8 GB reported memory and a 16K graphics limit. Showing '+tier.toUpperCase()+'.':requested === 'ultra' && tier !== '8k' ? 'Ultra detail is limited to ' + tier.toUpperCase() + ' on this device.' : requested === 'high' && tier === '2k' ? 'High detail is limited to 2K on this device.' : '';
    if (tier === appliedTier && ['night', 'clouds'].every(key => maps[key]?.image?.width === detailWidth)) { resize(); notify(); return getState(); }
    onStatus('Loading ' + tier.toUpperCase() + ' Earth detail…'); notify();
    try {
      if (tier !== appliedTier) {
        const day = await loadTexture(tier==='16k'?'/assets/cosmos/earth-day-16k.jpg':'earth-day-' + tier + '.webp');
        if (disposed || token !== qualityToken) { day.dispose(); return getState(); }
        applyMap('day', day); appliedTier = tier; shadeForTier(); renderDemand();
      }
      for (const key of ['night', 'clouds']) {
        if (key === 'clouds' && observedCloud) continue;
        if ((maps[key]?.image?.width || 0) !== detailWidth) {
          try {
            const texture = await loadTexture(key==='night'&&detail==='8k'?'/assets/cosmos/earth-night-8k.webp':'earth-' + key + '-' + detail + '.webp', key !== 'clouds');
            if (disposed || token !== qualityToken) { texture.dispose(); return getState(); }
            applyMap(key, texture); renderDemand();
          } catch { /* Keep the already loaded lower-resolution layer. */ }
        }
      }
      if (!disposed && token === qualityToken) onStatus(appliedTier.toUpperCase() + ' Earth detail ready.');
    } catch {
      if (!disposed && token === qualityToken) {
        detailMessage = 'Higher detail could not load. Showing ' + appliedTier.toUpperCase() + ' imagery.';
        onStatus(detailMessage);
      }
    }
    if (!disposed && token === qualityToken) { resize(); notify(); }
    return getState();
  }
  function pause() { paused = true; flight.cancelAutopilot(); flight.setAnimated(false); sun.copy(targetSun); schedule(); draw(); notify(); }
  function resume() { paused = false; flight.setAnimated(!motion.matches); schedule(); notify(); }
  function togglePause() { paused ? resume() : pause(); return paused; }
  function setView(view) {
    const views = { sunrise: [-0.92, 0.28, 0.43], daylight: [-0.35, 0.5, 1.0], night: [-1.0, 0.20, -0.58] };
    if (disposed || (!views[view] && view !== 'live')) return;
    if (view === 'live') {currentView = view; cloudAngle = 0; clouds.rotation.y = 0; uniforms.uCloudOffset.value = 0; updateLiveSun(); renderDemand(); return;}
    currentView = view; targetSun.set(...views[view]).normalize();
    renderDemand();
  }
  // Camera range is measured from Earth's centre. The floor is an altitude, so it is converted with the current fit distance.
  const earthMaxZoom = () => fitDistance * EARTH_KM / (EARTH_KM + MIN_ORBIT_ALTITUDE_KM);
  const altitudeOf = value => fitDistance / value * EARTH_KM - EARTH_KM;
  const zoomAt = altitudeKm => fitDistance * EARTH_KM / (EARTH_KM + altitudeKm);
  // Programmatic and button zoom: immediate, clamped by the focused body's floor (Earth: MIN_ORBIT_ALTITUDE_KM).
  function setZoom(value) {
    if(!Number.isFinite(value)||value<=0||disposed)return;
    flight.setDistance(clamp(fitDistance*EARTH_KM/value,EARTH_KM*.5,MAX_RANGE_KM),true);
    if(zoomNow()<.58)void ensureCosmos();
    interactionUntil=performance.now()+8000;renderDemand();
  }
  // Fly the camera to a place at a chosen altitude (never below the floor).
  function viewLocation(lat,lon,altitudeKm=MIN_ORBIT_ALTITUDE_KM*1.1){
    // From the Moon, a planet or the galaxy this brings the camera home to Earth first.
    flight.jump({anchor:'Earth',distance:Math.max(altitudeKm,MIN_ORBIT_ALTITUDE_KM)+EARTH_KM});
    focusLocation(lat,lon);flight.setDistance(Math.max(altitudeKm,MIN_ORBIT_ALTITUDE_KM)+EARTH_KM,true);renderDemand();notify();
  }
  function zoomBy(delta) {if(flight.state.mode==='free'){flight.dolly(delta>0?.5:-.5);interactionUntil=performance.now()+8000;renderDemand();return;}const zoom=zoomNow();setZoom(zoom<.55?zoom*Math.exp(delta*6):zoom+delta);}
  function stepOrbit(dx=0,dy=0){flight.orbitStep(dx,dy);interactionUntil=performance.now()+8000;renderDemand();}
  function reset(){flight.cancelAutopilot();globe.rotation.set(0,-1.92,-.07);flight.jump({anchor:'Earth',distance:fitDistance*EARTH_KM,q:initialOrbit.toArray()});cloudAngle=0;clouds.rotation.y=0;uniforms.uCloudOffset.value=0;setView(options.view==='live'?'live':'sunrise');renderDemand();}
  function arcballPoint(x,y){
    const r=canvas.getBoundingClientRect();const distance=camera.position.length();
    const ray=new THREE.Vector3((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1,.5).applyMatrix4(camera.projectionMatrixInverse).normalize();
    if((cosmicState?.level||'earth')==='earth'){
      const b=-distance*ray.z,disc=b*b-distance*distance+1;
      if(disc>=0){const t=b-Math.sqrt(disc);return ray.multiplyScalar(t).add(new THREE.Vector3(0,0,distance)).normalize();}
    }
    const centre=new THREE.Vector3().project(camera),radius=Math.min(r.width,r.height)*.42;
    const px=(x-r.left-(centre.x+1)*r.width/2)/radius,py=((1-centre.y)*r.height/2-(y-r.top))/radius,r2=px*px+py*py;
    return new THREE.Vector3(px,py,r2<.5?Math.sqrt(1-r2):.5/Math.sqrt(r2)).normalize();
  }
  const nowSec = () => performance.now() / 1000;
  const syncOrbit = () => cameraOrbit.fromArray(flight.orbitQuaternion());
  // Direction (scene frame, unit, from the focused body's centre) of the surface point under a screen position, or null.
  function hitAt(x, y) {
    const r = canvas.getBoundingClientRect();
    rayDir.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1, .5).unproject(camera).sub(camera.position).normalize();
    return flight.rayHit(rayDir.x, rayDir.y, rayDir.z, hitDir) ? hitDir : null;
  }
  function pointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2) return;
    canvas.focus({ preventScroll: true });
    if (!pointers.size) {
      flight.cancelAutopilot(); gestureStart={x:event.clientX,y:event.clientY}; gestureMoved=event.button===2; rightDown = event.button === 2;
      lookDrag = event.button === 2 || flight.state.mode === 'free';
      if (lookDrag) lastLook = { x: event.clientX, y: event.clientY };
      else { syncOrbit(); dragOrbit = cameraOrbit.clone(); dragVector = arcballPoint(event.clientX, event.clientY); flight.dragStart(nowSec()); }
    } else { gestureMoved = true; dragOrbit = null; dragVector = null; lastLook = null; flight.state.drag.active = false; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { canvas.setPointerCapture(event.pointerId); } catch { /* A cancelled gesture has no capture. */ }
    canvas.style.cursor = 'grabbing'; interactionUntil = performance.now() + 2500;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchDistance = Math.hypot(a.x - b.x, a.y - b.y); pad0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  }
  function pointerMove(event) {
    const previous = pointers.get(event.pointerId); if (!previous) return;
    if (gestureStart && Math.hypot(event.clientX-gestureStart.x,event.clientY-gestureStart.y)>7) gestureMoved = true;
    const next = { x: event.clientX, y: event.clientY }; pointers.set(event.pointerId, next);
    if (pointers.size === 1) {
      if (lookDrag && lastLook) { // grab the sky: the view follows the finger
        if (rightDown && flight.state.mode !== 'free' && Math.hypot(next.x - gestureStart.x, next.y - gestureStart.y) <= 7) return; // a click is not a look
        const k = THREE.MathUtils.degToRad(camera.fov) / Math.max(1, height);
        flight.lookBy((next.x - lastLook.x) * k, (next.y - lastLook.y) * k); lastLook = next; interactionUntil = performance.now() + 8000; renderDemand();
      } else if (dragOrbit && dragVector) {
        const q = new THREE.Quaternion().setFromUnitVectors(dragVector, arcballPoint(next.x, next.y));
        cameraOrbit.copy(dragOrbit).multiply(q.invert()).normalize(); cameraOrbit.toArray(orbitTmp); flight.setOrbitQuaternion(orbitTmp, nowSec()); interactionUntil = performance.now() + 8000; renderDemand();
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (flight.state.mode === 'free') { // two fingers fly: drag up/down moves forward/back, sideways strafes, pinch changes speed
        if (pinchDistance > 0) flight.speedBy(distance / pinchDistance);
        if (pad0) flight.setMove(clamp((cx - pad0.x) / 80, -1, 1), 0, clamp((cy - pad0.y) / 80, -1, 1));
      } else if (pinchDistance > 0) { flight.zoomBy(pinchDistance / distance, hitAt(cx, cy)); if (flight.state.lzt > Math.log(EARTH_KM * 40)) void ensureCosmos(); }
      pinchDistance = distance; interactionUntil = performance.now() + 8000; schedule(); renderDemand();
    }
  }
  // A tap on a place selects it (Earth); a tap on another world flies there.
  function tap(x, y) {
    const p = pickLocation(x, y);
    if (p && focusId() === 'Earth') { options.onSelect?.(p); return; }
    const body = cosmos?.pickBody(x, y);
    if (body && body !== focusId()) void setScale(body); else if (p) options.onSelect?.(p);
  }
  function pointerUp(event) {
    if (event.type === 'pointerup' && pointers.size === 1 && gestureStart && !gestureMoved) tap(event.clientX, event.clientY);
    gestureStart=null;dragOrbit=null;dragVector=null;lastLook=null; pointers.delete(event.pointerId); pinchDistance=0;
    if (pointers.size < 2) { if (pad0) flight.setMove(0, 0, 0); pad0 = null; }
    if (pointers.size === 1) {
      const p = [...pointers.values()][0];
      if (flight.state.mode === 'free') lastLook = { x: p.x, y: p.y }; else { syncOrbit(); dragOrbit = cameraOrbit.clone(); dragVector = arcballPoint(p.x, p.y); flight.dragStart(nowSec()); }
    } else if (!pointers.size) { flight.dragEnd(nowSec()); lookDrag = false; canvas.style.cursor = 'grab'; schedule(); }
    interactionUntil = performance.now() + 2500;
  }
  function pickLocation(clientX,clientY) {
    if (!ready || disposed) return null;
    updateCamera(); globe.updateMatrixWorld(true);
    const r=canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);
    const hit=raycaster.intersectObject(surface)[0];
    if (!hit) return null;
    return vectorGeo(globe.worldToLocal(hit.point.clone()));
  }
  function focusLocation(lat,lon,{center=true}={}) {
    if (!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||disposed) return;
    selectedPoint={lat,lon};
    const p=geoVector(lat,lon), v=new THREE.Vector3(p.x,p.y,p.z);
    marker.position.copy(v).multiplyScalar(1.0005); marker.visible=true;
    if(!center){renderDemand();return;}
    globe.updateMatrixWorld(true); v.applyQuaternion(globe.quaternion);
    const north=new THREE.Vector3(0,1,0).applyQuaternion(globe.quaternion);
    lookFrom(v,north);
    interactionUntil=performance.now()+10000;
    renderDemand();
  }
  // Orbit orientation that looks at Earth's centre from direction v (scene frame) with the given up; keeps the distance.
  function lookFrom(v,north){
    new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(v,new THREE.Vector3(),north)).toArray(orbitTmp);
    if(flight.state.mode==='orbit'&&focusId()==='Earth')flight.setOrbitQuaternion(orbitTmp);
    else flight.jump({anchor:'Earth',distance:fitDistance*EARTH_KM,q:orbitTmp});
  }
  async function setWeatherTexture(url, at, metadata={}) {
    const token=++weatherToken;
    if (!url) {
      observedCloud?.dispose(); observedCloud=null; weatherAt=null; uniforms.uObservedCloud.value=0;uniforms.uCloudIR.value=0;
      uniforms.uCloud.value=maps.clouds || black; renderDemand(); return false;
    }
    const texture=await new Promise((resolve,reject)=>{
      let settled=false;
      const timer=setTimeout(()=>{settled=true;reject(new Error('Cloud image took too long to load.'));},15000);
      new THREE.TextureLoader().load(url,t=>{if(settled||disposed||token!==weatherToken){t.dispose();clearTimeout(timer);if(!settled)reject(new Error('Cloud request superseded.'));return;}settled=true;clearTimeout(timer);resolve(t);},undefined,()=>{if(!settled){settled=true;clearTimeout(timer);reject(new Error('Cloud image unavailable.'));}});
    });
    if (disposed||token!==weatherToken){texture.dispose();return false;}
    texture.colorSpace=THREE.NoColorSpace; texture.wrapS=THREE.RepeatWrapping;
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    observedCloud?.dispose(); observedCloud=texture; weatherAt=at; uniforms.uObservedCloud.value=1;uniforms.uCloudIR.value=metadata.kind==='infrared'?1:0;
    cloudAngle=0; clouds.rotation.y=0; uniforms.uCloudOffset.value=0;
    uniforms.uCloud.value=texture; renderDemand(); return true;
  }
  function setActive(active) {visible=!!active; schedule(); if(visible) renderDemand();}
  function dispose() {
    if (disposed) return; disposed = true;cosmos?.dispose(); qualityToken++; weatherToken++; observedCloud?.dispose(); if (raf) cancelAnimationFrame(raf);if(demandFrame)cancelAnimationFrame(demandFrame);
    resizeObserver.disconnect(); intersectionObserver?.disconnect(); cleanups.forEach(fn => fn());
    for (const map of Object.values(maps)) map?.dispose(); black.dispose();
    scene.traverse(object => { object.geometry?.dispose(); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose()); });
    renderer.dispose(); pointers.clear();
  }
  // Deterministic scene for tests and screenshots: fixed sub-solar point and a camera looking straight down at lat/lon.
  function setSceneGeo({sunLat,sunLon,camLat,camLon,zoom:z}={}){
    if(disposed)return;currentView='custom';globe.updateMatrixWorld(true);
    if(Number.isFinite(sunLat)&&Number.isFinite(sunLon)){const d=geoVector(sunLat,sunLon);targetSun.set(d.x,d.y,d.z).applyQuaternion(globe.quaternion).normalize();sun.copy(targetSun);}
    if(Number.isFinite(camLat)&&Number.isFinite(camLon)){const p=geoVector(camLat,camLon),v=new THREE.Vector3(p.x,p.y,p.z).applyQuaternion(globe.quaternion),n=new THREE.Vector3(0,1,0).applyQuaternion(globe.quaternion);lookFrom(v,n);}
    if(Number.isFinite(z))flight.setDistance(fitDistance*EARTH_KM/z,true);renderDemand();
  }
  function applyTime() { setView('live'); snapSun(); schedule(); renderDemand(); notify(); }
  function setTimeLive() { if (disposed) return clock.getState(); clock.setLive(); applyTime(); return clock.getState(); }
  function setTimeSpeed(mag) {
    if (disposed) return clock.getState();
    const n = Number(mag); if (!Number.isFinite(n) || n <= 0) return clock.getState();
    const s = clock.getState();
    if (s.live && n === 1) return s;
    clock.setSpeed((s.live ? 1 : (s.speed < 0 ? -1 : 1)) * n); applyTime(); return clock.getState();
  }
  function setTimeDate(value) { if (disposed) return clock.getState(); clock.setDate(value); applyTime(); return clock.getState(); }
  function reverseTime() { if (disposed) return clock.getState(); clock.reverse(); applyTime(); return clock.getState(); }
  async function jumpSolarEclipse() { if (disposed) return null; const info = await clock.jumpSolar(); applyTime(); return info; }
  async function jumpLunarEclipse() { if (disposed) return null; const info = await clock.jumpLunar(); applyTime(); return info; }
  const api = { setFlightMode, flyTo: setScale, cancelAutopilot: () => { flight.cancelAutopilot(); renderDemand(); notify(); }, getFlight: flightInfo, playPath: async keys => { await ensureCosmos(); flight.setAnimated(animatedNow()); return flight.playPath(keys, { onDone: () => { renderDemand(); notify(); } }); }, __cinemaDemo: async () => api.playPath(Flight.DEMO_PATH), setSceneGeo, getState, pause, resume, togglePause, setView, setQuality, setZoom, zoomBy, viewLocation, minAltitudeKm:MIN_ORBIT_ALTITUDE_KM, stepOrbit, reset, pickLocation, focusLocation, setWeatherTexture, setActive,setScale,setDeepSky,dispose, turn: name => { if (!disposed) discreteKey(name); }, setTimeLive, setTimeSpeed, setTimeDate, reverseTime, jumpSolarEclipse, jumpLunarEclipse };
  // Test hooks (not part of the interface): only when a test sets window.__earthTestHooks before the page loads.
  if (window.__earthTestHooks) Object.assign(api, { pickBodyAt: (x, y) => cosmos?.pickBody(x, y) || null, __seek: tau => { const a = flight.state.auto; if (!a) return false; a.seg.duration = 1e9; a.t = clamp(tau, 0, 1); flight.step(0); renderDemand(); return true; } });
  if (canvas.tabIndex < 0) canvas.tabIndex = 0;
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  bind(canvas, 'pointerdown', pointerDown); bind(canvas, 'pointermove', pointerMove);
  bind(canvas, 'pointerup', pointerUp); bind(canvas, 'pointercancel', pointerUp); bind(canvas, 'lostpointercapture', pointerUp);
  /* Keyboard. Orbit mode: arrows or A/D orbit, W/S zoom, +/- step the zoom. Free flight: W/A/S/D move, Q/E down/up, arrows look,
     Z/C roll, Shift boosts. F enters free flight, O orbits the nearest world, [ and ] change the cruise speed, Esc stops the autopilot.
     A key held for less than 140 ms still moves the camera a little, so a tap always does something. */
  const keysDown = new Set(), pressedAt = new Map(), keyTimers = new Map(), animatedNow = () => !paused && !motion.matches;
  const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'z', 'c', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift']);
  function applyKeys() {
    const k = n => keysDown.has(n) ? 1 : 0;
    flight.setBoost(keysDown.has('Shift'));
    if (flight.state.mode === 'free') {
      flight.setMove(k('d') - k('a'), k('e') - k('q'), k('s') - k('w')); flight.setLook((k('ArrowLeft') - k('ArrowRight')) * 1.1, (k('ArrowUp') - k('ArrowDown')) * 1.1, (k('z') - k('c')) * 1); flight.setOrbitInput(0, 0, 0);
    } else {
      flight.setOrbitInput(k('ArrowRight') - k('ArrowLeft') + k('d') - k('a'), k('ArrowUp') - k('ArrowDown'), k('w') - k('s')); flight.setMove(0, 0, 0); flight.setLook(0, 0, 0);
    }
    interactionUntil = performance.now() + 8000; schedule(); renderDemand();
  }
  function discreteKey(name) { // paused or reduced motion: one step per key press, no inertia
    if (flight.state.mode === 'free') {
      const m = { w: [0, 0, -1], s: [0, 0, 1], a: [-1, 0, 0], d: [1, 0, 0], q: [0, -1, 0], e: [0, 1, 0] }[name];
      if (m) flight.nudge(m[0], m[1], m[2]); else flight.lookBy({ ArrowLeft: .12, ArrowRight: -.12 }[name] || 0, { ArrowUp: .1, ArrowDown: -.1 }[name] || 0, { z: .12, c: -.12 }[name] || 0);
    } else {
      const m = { ArrowLeft: [-.14, 0], ArrowRight: [.14, 0], ArrowUp: [0, .1], ArrowDown: [0, -.1], a: [-.14, 0], d: [.14, 0] }[name];
      if (m) flight.orbitStep(m[0], m[1]); else if (name === 'w') zoomBy(.12); else if (name === 's') zoomBy(-.12);
    }
    interactionUntil = performance.now() + 8000; renderDemand();
  }
  function setFlightMode(mode) {
    if (disposed) return flight.state.mode;
    keysDown.clear(); flight.setMove(0, 0, 0); flight.setLook(0, 0, 0); flight.setOrbitInput(0, 0, 0);
    if (mode === 'free') flight.enterFree(); else if (mode === 'orbit') flight.enterOrbit();
    interactionUntil = performance.now() + 8000; schedule(); renderDemand(); notify(); return flight.state.mode;
  }
  bind(canvas, 'keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const name = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (name === 'Escape' && travelling()) { event.preventDefault(); flight.cancelAutopilot(); renderDemand(); notify(); return; }
    const actions = { '+': () => zoomBy(0.12), '=': () => zoomBy(0.12), '-': () => zoomBy(-0.12), '_': () => zoomBy(-0.12), Home: reset, ' ': togglePause, f: () => setFlightMode('free'), o: () => setFlightMode('orbit'),
      '[': () => { flight.speedBy(1 / 1.25); renderDemand(); notify(); }, ']': () => { flight.speedBy(1.25); renderDemand(); notify(); } };
    if (actions[name]) { event.preventDefault(); if (!event.repeat || name === '+' || name === '=' || name === '-' || name === '_') actions[name](); return; }
    if (!MOVE_KEYS.has(name)) return;
    event.preventDefault();
    if (name === 'Shift') { if (!keysDown.has('Shift')) { keysDown.add('Shift'); applyKeys(); } return; }
    if (!animatedNow()) { discreteKey(name); return; }
    if (keyTimers.has(name)) { clearTimeout(keyTimers.get(name)); keyTimers.delete(name); }
    if (!keysDown.has(name)) { keysDown.add(name); pressedAt.set(name, performance.now()); applyKeys(); }
  });
  bind(canvas, 'keyup', event => {
    const name = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (!keysDown.has(name)) return;
    const wait = name === 'Shift' ? 0 : Math.max(0, 140 - (performance.now() - (pressedAt.get(name) || 0)));
    clearTimeout(keyTimers.get(name)); keyTimers.set(name, setTimeout(() => { keysDown.delete(name); keyTimers.delete(name); if (!disposed) applyKeys(); }, wait));
  });
  bind(canvas, 'blur', () => { if (keysDown.size) { keysDown.clear(); applyKeys(); } });
  bind(canvas, 'contextmenu', event => event.preventDefault());
  bind(canvas, 'wheel', event => {
    event.preventDefault(); flight.cancelAutopilot();
    if (flight.state.mode === 'free') { flight.speedBy(Math.exp(-event.deltaY * .0018)); renderDemand(); notify(); return; }
    const zoom = zoomNow(), k = event.ctrlKey ? .012 : zoom < .01 ? .006 : zoom < .55 ? .003 : .001;
    flight.zoomBy(Math.exp(event.deltaY * k), hitAt(event.clientX, event.clientY));
    if (flight.state.lzt > Math.log(EARTH_KM * 40)) void ensureCosmos();
    interactionUntil = performance.now() + 8000; schedule(); renderDemand();
  }, { passive: false });
  const sunTimer = setInterval(()=>{if(currentView==='live'&&!document.hidden&&visible){draw();notify();}},30000);
  cleanups.push(()=>clearInterval(sunTimer));
  bind(document, 'visibilitychange', () => { schedule(); if (!document.hidden) draw(); notify(); });
  bind(motion, 'change', () => { if (motion.matches) pause(); notify(); });
  bind(canvas, 'webglcontextlost', event => { event.preventDefault(); contextLost = true; schedule(); onError(new Error('The graphics connection was interrupted.')); notify(); });
  bind(canvas, 'webglcontextrestored', () => { contextLost = false; renderDemand(); onReady(api); });
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resize();
  const intersectionObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); schedule(); if (visible) draw(); notify(); }, { threshold: 0.01 }) : null;
  intersectionObserver?.observe(canvas);
  onStatus('Loading Earth imagery…');
  try {
    const day = await loadTexture('earth-day-2k.webp');
    if (disposed) { day.dispose(); return api; }
    applyMap('day', day);
    const layers = await Promise.allSettled([loadTexture('earth-night-2k.webp'), loadTexture('earth-clouds-2k.webp', false)]);
    layers.forEach((result, i) => { if (result.status === 'fulfilled') applyMap(i === 0 ? 'night' : 'clouds', result.value); });
    if (disposed) return api;
    shadeForTier(); ready = true; resize(); draw(); schedule();
    void ensureCosmos();
    Promise.allSettled([loadTexture('/assets/cosmos/earth-normal-4k.webp',false),loadTexture('/assets/cosmos/earth-specular-4k.webp',false)]).then(rows=>{if(disposed){rows.forEach(r=>r.status==='fulfilled'&&r.value.dispose());return;}rows.forEach((r,i)=>{if(r.status==='fulfilled')applyMap(i===0?'normal':'ocean',r.value);});renderDemand();});
    onStatus('Earth ready.'); onReady(api); notify();
    if (tierFor(quality) !== '2k') void setQuality(quality);
    return api;
  } catch (error) {
    onError(error); dispose(); throw error;
  }
}


