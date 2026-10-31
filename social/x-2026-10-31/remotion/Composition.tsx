import { AbsoluteFill, Composition, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const fps = 30;
const durationInFrames = 16 * fps;

const colors = {
  ground: "#0c0d10",
  ink: "#ecece8",
  mute: "#a7a9ae",
  red: "#f23a52",
};

const Scene: React.FC<{
  start: number;
  end: number;
  children: React.ReactNode;
}> = ({ start, end, children }) => {
  const frame = useCurrentFrame();
  const { fps: videoFps } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [start * videoFps, start * videoFps + 12, end * videoFps - 8, end * videoFps],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  const translate = interpolate(
    frame,
    [start * videoFps, start * videoFps + 12],
    [28, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 88,
        right: 88,
        top: 200,
        bottom: 200,
        opacity,
        translate: `0 ${translate}px`,
      }}
    >
      {children}
    </div>
  );
};

const Kicker: React.FC<{ children: string }> = ({ children }) => (
  <p style={{ fontFamily: "IBM Plex Mono, ui-monospace, monospace", fontSize: 28, letterSpacing: "0.18em", textTransform: "uppercase", color: colors.red, marginBottom: 22 }}>{children}</p>
);

const Giant: React.FC<{ children: string }> = ({ children }) => (
  <p style={{ fontSize: 180, lineHeight: 0.9, letterSpacing: "-0.05em", fontWeight: 650, margin: 0 }}>{children}</p>
);

const Line: React.FC<{ children: string }> = ({ children }) => (
  <p style={{ fontSize: 58, lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 650, margin: 0 }}>{children}</p>
);

const Sub: React.FC<{ children: string }> = ({ children }) => (
  <p style={{ fontSize: 32, lineHeight: 1.35, color: colors.mute, marginTop: 26 }}>{children}</p>
);

const Card: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <p style={{ margin: "0 0 28px" }}>
    <strong style={{ display: "block", fontFamily: "IBM Plex Mono, ui-monospace, monospace", fontSize: 40 }}>{title}</strong>
    <span style={{ display: "block", marginTop: 8, color: colors.mute, fontSize: 26 }}>{body}</span>
  </p>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: colors.ground, color: colors.ink, fontFamily: "Inter, system-ui, sans-serif" }}>
    {children}
    <p style={{ position: "absolute", left: 88, bottom: 120, fontFamily: "IBM Plex Mono, ui-monospace, monospace", fontSize: 20, letterSpacing: "0.16em", textTransform: "uppercase", color: colors.mute }}>
      Supercharged Daily
    </p>
  </AbsoluteFill>
);

export const Falcon700: React.FC = () => (
  <Shell>
    <Scene start={0} end={4.2}>
      <Kicker>SpaceX · 30 Oct 2026</Kicker>
      <Giant>700</Giant>
      <Sub>Falcon 9 flights. One rocket family, now a routine.</Sub>
    </Scene>
    <Scene start={4.1} end={10.2}>
      <Kicker>Starlink 15-18</Kicker>
      <Card title="9:04 p.m. PT" body="Vandenberg SLC-4E" />
      <Card title="27 satellites" body="to low Earth orbit" />
      <Card title="B1093 · flight 18" body="landed on Of Course I Still Love You" />
    </Scene>
    <Scene start={10.2} end={16}>
      <Line>Rockets used to be rare. This one closed out October.</Line>
      <Giant>700</Giant>
    </Scene>
  </Shell>
);

export const Robotaxi: React.FC = () => (
  <Shell>
    <Scene start={0} end={4.4}>
      <Kicker>Tesla · Texas register · 31 Oct</Kicker>
      <Giant>1,204</Giant>
      <Sub>Robotaxis on the public TxDMV list. Registered, not in service.</Sub>
    </Scene>
    <Scene start={4.3} end={9.9}>
      <Kicker>The mix</Kicker>
      <Line>+124 Model Ys added in a day.</Line>
      <Card title="631 Model Y" body="573 Cybercab" />
    </Scene>
    <Scene start={9.9} end={16}>
      <Kicker>Same Texas register</Kicker>
      <Card title="Waymo 1,259" body="Jaguar I-PACE + Zeekr RT" />
      <Card title="Tesla 1,204" body="Gap: 55 vehicles" />
      <Sub>A listing is not a ride. No city split on the register.</Sub>
    </Scene>
  </Shell>
);

export const Flight15: React.FC = () => (
  <Shell>
    <Scene start={0} end={4.6}>
      <Kicker>Starship Flight 15</Kicker>
      <Line>Catch both.</Line>
      <Sub>No orbital rocket has ever been fully recovered.</Sub>
    </Scene>
    <Scene start={4.5} end={10.2}>
      <Kicker>Ground tests done</Kicker>
      <Card title="Ship 42" body="Six-engine static fire + deorbit burn sim. SpaceX, 28 Oct." />
      <Card title="Booster 22" body="Full-duration 33-engine static fire, 25 Oct." />
    </Scene>
    <Scene start={10.2} end={16}>
      <Line>November. No official date.</Line>
      <Sub>Elon says they will try both catches. Shotwell expects the FAA licence to cover it.</Sub>
    </Scene>
  </Shell>
);

export const MyComposition = () => {
  return (
    <>
      <Composition id="Falcon700" component={Falcon700} durationInFrames={durationInFrames} fps={fps} width={1080} height={1920} />
      <Composition id="Robotaxi" component={Robotaxi} durationInFrames={durationInFrames} fps={fps} width={1080} height={1920} />
      <Composition id="Flight15" component={Flight15} durationInFrames={durationInFrames} fps={fps} width={1080} height={1920} />
    </>
  );
};
