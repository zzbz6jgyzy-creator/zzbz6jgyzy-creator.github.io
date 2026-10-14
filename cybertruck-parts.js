// Part explainers for the Cybertruck explorer. Every number below comes from the linked source; nothing is estimated.
const CD = { label: 'Car and Driver: Tesla Cybertruck', url: 'https://www.caranddriver.com/tesla/cybertruck' };
const TESLA = { label: 'Tesla: Cybertruck', url: 'https://www.tesla.com/cybertruck' };
const MAN = { label: 'Tesla Cybertruck Owner’s Manual', url: 'https://www.tesla.com/ownersmanual/cybertruck/en_us/' };
const OFFROAD = { label: 'Tesla: Cybertruck Off-Road Guide', url: 'https://service.tesla.com/docs/Cybertruck/cybertruck_offroad_guide.pdf' };
const MV = { label: 'Tesla Service Manual: 48V mid-voltage architecture', url: 'https://service.tesla.com/docs/Cybertruck/ServiceManual/en-us/GUID-F90C7408-43DA-4855-842C-C9534CDC61F2.html' };

export const PARTS = {
  body: {
    name: 'Stainless exoskeleton',
    variant: 'Production Cybertruck (2024–)',
    desc: 'The outer skin is the structure. Instead of a painted body-on-frame pickup, Cybertruck uses a stainless-steel exoskeleton you can recognise from a motorway away — and that needs a different kind of care than car paint.',
    how: 'Hard stainless panels form the visible shell and carry load, sitting on a skateboard pack with motors at the axles. Car and Driver notes the shell is highly dent-resistant but not actually stain-proof: fingerprints and water spots are part of living with it. Ride height on air-sprung trucks changes the silhouette.',
    specs: [
      ['Size', '223.7 in long · 80.0 in wide · 68.5–76.6 in tall'],
      ['Wheelbase', '143.1 in'],
      ['Curb weight', '6,901 lb (Cyberbeast, Car and Driver test)'],
      ['Seats', '5'],
      ['Layout', 'Skateboard pack, motors at the axles'],
    ],
    facts: [
      'Length 223.7 in, width 80.0 in, height 68.5–76.6 in depending on air-suspension setting',
      'Wheelbase 143.1 in — a full-size truck that Car and Driver says drives smaller than it looks',
      'Cyberbeast test weight: 6,901 lb',
      'Passenger volume: 62 cu ft front / 57 cu ft rear',
      'Stainless shell is dent-resistant; Car and Driver still flags fingerprints and broken early promises',
    ],
    src: CD, src2: TESLA,
  },
  glass: {
    name: 'Armor glass',
    variant: 'Production Cybertruck',
    desc: 'The steep windshield and side glass are laminated for impact resistance — the same family of idea Tesla showed at the 2019 unveil, on a truck that actually shipped.',
    how: 'Fixed laminated glass with a UV-blocking coat. The A-pillar and roof line are part of the exoskeleton, so the greenhouse is a few large panes rather than a conventional pickup cab. It is still glass: chips and cracks happen, and replacements are not Model 3 cheap.',
    specs: [
      ['Windshield', 'Steep laminated armor glass'],
      ['Roof', 'Dark glass panel in the stainless roof'],
      ['Cabin', 'Car and Driver: surprisingly generous rear headroom despite the slope'],
    ],
    facts: [
      'Laminated armor glass on the production truck, not the 2019 concept’s failed demo pane as a spec',
      'Rear headroom is better than the roofline suggests; riders over six feet may still find it snug',
      'The glass and stainless together are the Cybertruck silhouette',
    ],
    src: CD, src2: TESLA,
  },
  lights: {
    name: 'Light bar & lamps',
    variant: 'Production Cybertruck',
    desc: 'A thin LED bar runs the full width of the nose. At night that single line is how you spot a Cybertruck three lanes over. The tail is a matching full-width lamp on the stainless rear.',
    how: 'LED projectors sit behind the bar; turn signals, DRLs and headlamps share that graphic. An optional off-road light bar was part of the Foundation Series pack Car and Driver listed on its Beast test truck. Fog and reverse lamps live lower in the bumper, not in the slim strip.',
    specs: [
      ['Front', 'Full-width LED light bar'],
      ['Rear', 'Full-width lamp on the tail'],
      ['Foundation option', 'Off-road light bar (Car and Driver Beast as-tested)'],
    ],
    facts: [
      'The front light bar is the production truck’s face — no conventional grille',
      'Foundation Series as-tested by Car and Driver included an off-road light bar in the $20,000 pack',
      'Rear lighting is a single bar across the stainless tail, above the bumper',
    ],
    src: CD, src2: TESLA,
  },
  wheels: {
    name: 'Cyberwheels & tires',
    variant: '20-inch Cyber wheels',
    desc: 'Production trucks wear 20-inch Cyber wheels. Car and Driver’s Beast test truck rolled on 20-inch wheels with 35-inch Goodyear Wrangler Territory R/T all-terrains as part of the Foundation pack.',
    how: 'A squared-off stainless body sits on relatively tall sidewalls, which is why the truck can look planted even with air suspension dropped. Tire choice changes payload: Car and Driver says an all-terrain-shod Premium can carry the most, 2,500 lb.',
    specs: [
      ['Wheels', '20-inch Cyber wheels (Foundation / Beast test)'],
      ['Tires', 'Goodyear Wrangler Territory RT LT285/65R-20'],
      ['Payload', 'Up to 2,500 lb (Premium, all-terrain)'],
    ],
    facts: [
      'Car and Driver Beast test: 20-inch Cyber wheels with 35-inch tires in the Foundation pack',
      'Test tires: Goodyear Wrangler Territory RT LT285/65R-20 123/120H M+S',
      'Payload varies with model and tire; Premium on all-terrains is listed at 2,500 lb',
    ],
    src: CD,
  },
  brakes: {
    name: 'Brake discs',
    variant: 'Cyberbeast (Car and Driver test)',
    desc: 'Big vented discs at all four corners. The truck is a 6,900-pound pickup that can hit 60 mph in the mid-2s, so the hardware has to match the motors.',
    how: 'Hydraulic discs do the panic stops; everyday slowing is mostly regenerative through the drive units. Car and Driver measured 176 feet from 70–0 mph on the Beast.',
    specs: [
      ['Front', '13.8-in vented disc'],
      ['Rear', '14.0-in vented disc'],
      ['70–0 mph', '176 ft (Cyberbeast)'],
      ['100–0 mph', '367 ft (Cyberbeast)'],
    ],
    facts: [
      'Front 13.8-in and rear 14.0-in vented discs on the Beast Car and Driver tested',
      '70–0 mph in 176 ft; 100–0 mph in 367 ft',
      'Skidpad: 0.75 g on the same test truck',
    ],
    src: CD,
  },
  cabin: {
    name: 'Cabin',
    variant: 'Premium / Cyberbeast interior',
    desc: 'A long, flat dash, yoke-or-wheel steering, and almost no buttons. Car and Driver calls it a spartan cabin: if you thought the Model 3 was minimal, this is that idea stretched across a full-size truck.',
    how: 'Base Dual Motor gets heated fronts and one screen. Premium and Cyberbeast add ventilation plus a second screen for the rear bench. Rear headroom is better than the roofline looks; six-footers can still feel the slope. Interior cargo with the rear seats folded: 22 carry-on cases in Car and Driver’s test.',
    specs: [
      ['Seats', '5'],
      ['Front volume', '62 cu ft'],
      ['Rear volume', '57 cu ft'],
      ['Cabin cargo', '22 carry-ons, rear seats folded (C&D)'],
      ['Base vs Premium', 'Base: heat + one screen · Premium/Beast: heat, vent, rear screen'],
    ],
    facts: [
      'Car and Driver: base model has heated fronts and one touchscreen; Premium and Beast add ventilation and a rear screen',
      'Rear headroom is surprisingly generous given the slope; riders over six feet may find it snug',
      'Folded-rear interior held 22 carry-on suitcases in their test',
      'No Apple CarPlay or Android Auto — same Tesla rule as the cars',
    ],
    src: CD, src2: TESLA,
  },
  display: {
    name: '18.5-inch screen',
    variant: 'Every Cybertruck; 9.4-inch rear on Premium / Beast',
    desc: 'The centre display is 18.5 inches — bigger than a Model 3’s — and it is how you shift, steer-adjust, and set ride height. Premium and Cyberbeast add a 9.4-inch screen on the back of the console.',
    how: 'One landscape touchscreen runs climate, audio, cameras and the steer-by-wire settings. Base trucks get a 7-speaker stereo; Premium can take 15 speakers. SiriusXM and a Wi-Fi hotspot are listed; CarPlay and Android Auto are not.',
    specs: [
      ['Centre', '18.5-inch touchscreen (all trucks)'],
      ['Rear', '9.4-inch (Premium and Cyberbeast)'],
      ['Audio', '7-speaker standard · 15-speaker optional'],
      ['Phone apps', 'No CarPlay or Android Auto'],
    ],
    facts: [
      'Every Cybertruck has the 18.5-inch centre display',
      'Premium and Cyberbeast add the 9.4-inch rear-seat screen',
      'Car and Driver: SiriusXM and a hotspot are included; CarPlay / Android Auto are not',
    ],
    src: CD,
  },
  battery: {
    name: 'High-voltage pack',
    variant: 'Cyberbeast test pack (Car and Driver)',
    desc: 'A liquid-cooled lithium-ion pack under the floor. That is why the cabin is flat and the centre of gravity is low for a 6,900-pound truck. Tesla does not publish a single official kWh for every trim; Car and Driver recorded 123.0 kWh on the Beast they tested.',
    how: 'The pack is the skateboard. An 11.5 kW onboard charger takes AC; DC Supercharging bypasses it and feeds the pack directly at up to 250 kW. Tesla’s range claims (320–350 miles) ran well ahead of Car and Driver’s 75-mph test: 250 miles on both the RWD and the Beast.',
    specs: [
      ['Pack', '123.0 kWh liquid-cooled lithium-ion (Beast test)'],
      ['AC charge', '11.5 kW onboard'],
      ['DC charge', '250 kW peak'],
      ['Claimed range', '325 mi AWD · 320 mi Beast · 350 mi RWD (Tesla)'],
      ['C&D 75-mph test', '250 mi (RWD and Beast)'],
      ['Warranty', '8 years / 150,000 miles on pack and drive'],
    ],
    facts: [
      'Car and Driver Beast: 123.0 kWh pack, 11.5 kW AC, 250 kW peak DC',
      'Tesla estimates 325 miles (AWD), 320 (Beast), 350 (discontinued RWD)',
      'Car and Driver 75-mph highway: 250 miles on RWD and on Beast — well short of the claims',
      'Mixed driving on the Beast: 55 MPGe',
      'Tesla: 15 minutes on a Supercharger adds a claimed 132–137 miles depending on trim',
      'Powertrain and battery warranty: 8 years / 150,000 miles',
    ],
    src: CD, src2: TESLA,
  },
  rearMotor: {
    name: 'Rear drive unit',
    variant: 'AWD Dual Motor / Cyberbeast',
    desc: 'The rear unit does the everyday work on Dual Motor trucks and is joined by a second rear motor on Cyberbeast. Car and Driver’s Beast test listed a rear induction motor at 284 hp and 544 lb-ft.',
    how: 'A liquid-cooled motor with a single-speed reduction gear — no multi-gear gearbox. Dual Motor AWD is 593 hp combined. Cyberbeast is 834 hp and 740 lb-ft combined from three motors. Regenerative braking turns the motor into a generator.',
    specs: [
      ['Beast rear', 'Induction AC, 284 hp · 544 lb-ft (C&D)'],
      ['Dual Motor pair', '593 hp combined'],
      ['Cyberbeast trio', '834 hp · 740 lb-ft combined'],
      ['Gearbox', 'Direct-drive (single speed)'],
    ],
    facts: [
      'Dual Motor AWD: 593 hp from two motors',
      'Cyberbeast: 834 hp and 740 lb-ft from three motors',
      'Beast rear motor in the C&D chart: induction AC, 284 hp, 544 lb-ft',
      'All trucks: direct-drive, no multi-speed gearbox',
    ],
    src: CD,
  },
  frontMotor: {
    name: 'Front drive unit',
    variant: 'AWD Dual Motor / Cyberbeast',
    desc: 'AWD trucks add a front motor so the Cybertruck can pull on all four. On the Beast Car and Driver tested, the front unit was a permanent-magnet synchronous motor at 276 hp and 320 lb-ft.',
    how: 'Same idea as Tesla’s car dual-motors: a smaller (or different-type) motor up front, inverter on the housing, half-shafts to the front hubs. Rear-wheel-drive trucks — a short-lived Long Range RWD — used a 321-hp single motor and no front unit.',
    specs: [
      ['Beast front', 'Permanent-magnet synchronous AC, 276 hp · 320 lb-ft'],
      ['RWD only', '321 hp single motor (discontinued Long Range)'],
      ['AWD', 'Front motor + rear motor(s)'],
    ],
    facts: [
      'Cyberbeast front motor: PMSM, 276 hp, 320 lb-ft (Car and Driver)',
      'A short-lived 2025 RWD Long Range used a 321-hp single motor; it was dropped after about five months',
      'Base 2026 Dual Motor and Premium AWD share the same 593-hp two-motor set',
    ],
    src: CD,
  },
  inverter: {
    name: 'Inverters',
    variant: 'Every drive unit',
    desc: 'Each motor has an inverter that turns pack DC into the AC that spins the rotor. They bolt to the drive-unit housings at the axles, with orange high-voltage cables back to the pack.',
    how: 'Variable-frequency drive: the inverter sets motor speed and regen. On a Cyberbeast that is three inverters. They share the same liquid-cooling loop as the motors and pack.',
    specs: [
      ['Job', 'DC from the pack → AC for each motor'],
      ['Count', 'One per motor (2 on AWD, 3 on Beast)'],
      ['Cooling', 'Shared liquid loop with the drive units'],
    ],
    facts: [
      'One inverter per motor — two on Dual Motor, three on Cyberbeast',
      'Cables from the floor pack run to each axle housing',
      'The same loop cools pack, motors and inverters',
    ],
    src: CD,
  },
  lv: {
    name: '48V mid-voltage system',
    variant: 'Every Cybertruck',
    desc: 'Cybertruck dropped the 12-volt standard. Tesla’s service docs call it a 48-volt “mid-voltage” or MV architecture, built to cut current and improve efficiency. Accessories on the roof and in the frunk can tap it.',
    how: 'A 48V battery and distribution network run steering, body controllers and aux feeds. Tesla’s off-road guide: two 48V auxiliary power feeds, independently switched, deliver 36–58 V depending on LV state of charge — one on the roof, one in the powered frunk. Servicing MV parts has its own precautions.',
    specs: [
      ['Architecture', '48V mid-voltage (MV), not 12V'],
      ['Aux feeds', 'Two, 36–58 V depending on LV charge'],
      ['Locations', 'Roof and powered frunk'],
    ],
    facts: [
      'Tesla Service: Cybertruck electronics are powered by a 48V mid-voltage architecture',
      'Off-road guide: two 48V aux feeds, 36–58 V, on the roof and in the frunk',
      'Feeds can be enabled independently from the on-screen UI',
    ],
    src: MV, src2: OFFROAD,
  },
  steer: {
    name: 'Steer-by-wire & rear steer',
    variant: 'Every Cybertruck',
    desc: 'There is no mechanical column from the wheel to the rack. Sensors and motors turn the front wheels, and the rear wheels steer too. Car and Driver says that combination is why a truck this big feels agile in town.',
    how: 'Steer-by-wire: the wheel talks to actuators, not a shaft. Four-wheel steering: at low speed the rears turn opposite the fronts for a tighter radius; at speed they turn with the fronts. Tesla’s off-road guide lets you set Rear Steer to Off or Auto, and warns that stalling the steer motors can overheat them.',
    specs: [
      ['Front', 'Steer-by-wire — no mechanical link'],
      ['Rear', 'Four-wheel steering, Off or Auto'],
      ['Feel', 'C&D: variable-ratio, easy in urban use'],
    ],
    facts: [
      'Tesla: no physical connection between the steering wheel and the tires',
      'All four wheels steer; Auto rear steer tightens the turning radius',
      'Rear steer can be switched off from the off-road UI',
      'Car and Driver: rear-wheel steering plus variable-ratio steer-by-wire made the Beast easy to place in town',
    ],
    src: OFFROAD, src2: CD,
  },
  vault: {
    name: 'Vault bed & tonneau',
    variant: 'Composite 6×4 bed',
    desc: 'The bed is a lockable “vault”: a composite 6-by-4-foot tub with a powered tonneau and a hidden underfloor bin. Car and Driver measured 121 cubic feet of bed volume and another 3 cubic feet under the floor.',
    how: 'The stainless sides and the motorised cover turn the bed into a lockable box. Under the floor is extra storage large enough, in their test, for another suitcase. Tailgate and cover are power-operated on the trucks they describe.',
    specs: [
      ['Bed', '6 × 4 ft composite'],
      ['Bed volume', '121 cu ft (Car and Driver)'],
      ['Underfloor', '3 cu ft'],
      ['Tow (Premium / Beast)', '11,000 lb'],
      ['Tow (base Dual Motor)', '7,500 lb'],
    ],
    facts: [
      'Composite 6×4 bed; Car and Driver: 121 cu ft of bed volume',
      'Hidden underfloor compartment: 3 cu ft — one extra suitcase in their test',
      'Premium AWD and Cyberbeast: 11,000 lb tow rating',
      '2026 base Dual Motor: 7,500 lb (it also loses adaptive air suspension)',
    ],
    src: CD, src2: TESLA,
  },
  frunk: {
    name: 'Powered frunk',
    variant: 'Production Cybertruck',
    desc: 'The front trunk is a powered bin ahead of the dash. Car and Driver found it holds just one carry-on suitcase — useful, not a Model Y frunk. It also houses a 48V accessory feed.',
    how: 'A sealed tub between the front rails, lid on a power strut. Tesla’s off-road guide puts one of the two 48V aux power feeds in this frunk. The other is on the roof.',
    specs: [
      ['Volume', '7 cu ft (Car and Driver)'],
      ['C&D test', 'One carry-on suitcase'],
      ['Power', '48V aux feed in the frunk'],
    ],
    facts: [
      'Front trunk volume: 7 cubic feet',
      'Car and Driver: fits one carry-on; the cabin (seats folded) fits 22',
      'Off-road guide: a 48V accessory feed lives in the powered frunk',
    ],
    src: CD, src2: OFFROAD,
  },
  susp: {
    name: 'Air suspension',
    variant: 'Premium AWD and Cyberbeast',
    desc: 'Premium and Cyberbeast sit on adjustable air springs. Car and Driver: they can raise or lower the truck on the fly and provide up to 16 inches of ground clearance. The 2026 base Dual Motor steps down to coil springs with adaptive dampers.',
    how: 'Air springs at each corner plus adaptive damping. Tesla’s off-road guide lists adjustable air springs, adaptive damping, and ride-height presets for terrain. Approach angle 35°, departure 28° on the trucks Car and Driver quotes.',
    specs: [
      ['Premium / Beast', 'Adjustable air suspension'],
      ['Ground clearance', 'Up to 16 in (C&D)'],
      ['Base 2026 Dual Motor', 'Coil springs + adaptive dampers'],
      ['Angles', '35° approach · 28° departure'],
    ],
    facts: [
      'Air suspension on Premium AWD and Cyberbeast; up to 16 inches of ground clearance',
      '2026 base Dual Motor: coils and adaptive dampers, and a lower price',
      '35-degree approach and 28-degree departure angles',
      'Off-road guide: customise ride height from the UI; Wade mode for shallow water',
    ],
    src: CD, src2: OFFROAD,
  },
  chargePort: {
    name: 'Charge port',
    variant: 'Left-rear NACS',
    desc: 'The charge door sits on the left rear quarter — you can see the cable in any Supercharger photo. Same Tesla plug as the cars, on a truck Tesla classes as heavy-duty so it does not have to post EPA MPGe.',
    how: 'NACS inlet to the onboard 11.5 kW charger for AC, or straight to the pack on DC. Car and Driver: 50 minutes to go 10–90% on the Beast they charged; Tesla claims 132–137 miles back in 15 minutes on a Supercharger, depending on trim.',
    specs: [
      ['Inlet', 'Left rear, Tesla NACS'],
      ['AC', '11.5 kW onboard'],
      ['DC peak', '250 kW'],
      ['C&D 10–90%', '50 min (Beast)'],
    ],
    facts: [
      'Charge port is on the left rear of the truck',
      '11.5 kW AC onboard; 250 kW peak DC',
      'Car and Driver Beast: 50 minutes from 10 to 90 percent DC',
      'Tesla: 15 minutes adds a claimed 132 mi (base Dual Motor), 137 mi (Premium) or 135 mi (Beast)',
    ],
    src: CD,
  },
  cameras: {
    name: 'Cameras',
    variant: 'Autopilot / FSD hardware',
    desc: 'The same camera-first Tesla stack, on a much taller, wider body. Autopilot is standard; Full Self-Driving is optional. Neither is unsupervised autonomous driving.',
    how: 'Cameras in the front, sides, rear and cabin feed the computer. Car and Driver lists adaptive cruise, lane-centering and blind-spot monitoring as standard, with automatic lane change and parking tech on the optional suite. Sensor geometry is not a Model 3’s — do not assume FSD timing matches the cars.',
    specs: [
      ['Standard', 'Autopilot (adaptive cruise, lane-centering)'],
      ['Optional', 'Full Self-Driving (Supervised)'],
      ['Also standard', 'Blind-spot monitoring'],
    ],
    facts: [
      'Autopilot is standard; FSD is optional — neither is fully autonomous',
      'Standard: adaptive cruise, lane-centering, blind-spot monitoring (Car and Driver)',
      'Optional: automatic lane change and advanced parking tech',
    ],
    src: CD, src2: TESLA,
  },
  hvac: {
    name: 'Climate system',
    variant: 'Heat-pump truck',
    desc: 'A heat-pump HVAC stack behind the dash, shared with pack thermal management — the same idea as Tesla’s cars, sized for a five-seat stainless box with a glass roof.',
    how: 'A manifold and compressor move heat between cabin, pack and outside air. Seat heat is standard; Premium and Beast add ventilation. Ride-height and off-road modes do not replace a proper precondition before a DC charge.',
    specs: [
      ['Type', 'Heat pump, shared with the pack loop'],
      ['Seats', 'Heated fronts standard; ventilated on Premium / Beast'],
      ['Rear', 'Climate from the 9.4-inch screen on Premium / Beast'],
    ],
    facts: [
      'Cabin and pack share a thermal system, as on Tesla’s cars',
      'Base: heated fronts; Premium and Beast: heated and ventilated',
      'Rear passengers on Premium / Beast get climate controls on the 9.4-inch screen',
    ],
    src: CD,
  },
};

const CC_BYSA3 = 'https://creativecommons.org/licenses/by-sa/3.0/';
const CC_BYSA4 = 'https://creativecommons.org/licenses/by-sa/4.0/';
const CC_BY4 = 'https://creativecommons.org/licenses/by/4.0/';
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

export const PHOTOS = {
  body: { src: '/assets/ctx-media/body.webp', alt: 'Foundation Series Cybertruck, front left, Greenwich', by: 'Mr.choppers', lic: 'CC BY-SA 3.0', licUrl: CC_BYSA3, url: 'https://commons.wikimedia.org/wiki/File:2024_Tesla_Cybertruck_Foundation_Series,_front_left_(Greenwich).jpg' },
  lights: { src: '/assets/ctx-media/lights.webp', alt: 'Cybertruck at night in Moab with the front light bar lit', by: 'A1C6', lic: 'CC0', licUrl: CC0, url: 'https://commons.wikimedia.org/wiki/File:2024_Tesla_Cybertruck,_Moab_02.jpg' },
  wheels: { src: '/assets/ctx-media/wheels.webp', alt: 'Side view of a wrapped Cybertruck showing the 20-inch Cyber wheels', by: 'Kidfly182', lic: 'CC BY 4.0', licUrl: CC_BY4, url: 'https://commons.wikimedia.org/wiki/File:Tesla_Cybertruck_003.jpg' },
  cabin: { src: '/assets/ctx-media/cabin.webp', alt: 'Cybertruck cabin and yoke from the driver’s seat', by: 'Mpelas199', lic: 'CC0', licUrl: CC0, url: 'https://commons.wikimedia.org/wiki/File:Tesla_Cybertruck_-_Interior_-_Tesla_Store_Athens_2024.jpg' },
  display: { src: '/assets/ctx-media/display.webp', alt: 'Cybertruck 18.5-inch centre touchscreen', by: 'Mpelas199', lic: 'CC0', licUrl: CC0, url: 'https://commons.wikimedia.org/wiki/File:Tesla_Cybertruck_-_Interior_3_-_Tesla_Store_Athens_2024.jpg' },
  vault: { src: '/assets/ctx-media/vault.webp', alt: 'Foundation Series Cybertruck rear three-quarter showing the vault bed', by: 'Mr.choppers', lic: 'CC BY-SA 3.0', licUrl: CC_BYSA3, url: 'https://commons.wikimedia.org/wiki/File:2024_Tesla_Cybertruck_Foundation_Series,_rear_left_(Greenwich).jpg' },
  chargePort: { src: '/assets/ctx-media/chargePort.webp', alt: 'Cybertruck charging at a downtown Keene, NH station, cable in the left-rear port', by: 'Artaxerxes', lic: 'CC BY 4.0', licUrl: CC_BY4, url: 'https://commons.wikimedia.org/wiki/File:Charging_Tesla_Cybertruck_downtown_Keene_NH_July_2024.jpg' },
};

export const ORDER = ['body','glass','lights','wheels','brakes','cabin','display','battery','rearMotor','frontMotor','inverter','lv','steer','vault','frunk','susp','chargePort','cameras','hvac'];
