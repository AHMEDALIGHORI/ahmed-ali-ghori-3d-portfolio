/**
 * Single source of truth for the site's content.
 *
 * Profile facts and every project line come from github.com/AHMEDALIGHORI
 * (repository descriptions and the public profile API). Experience entries are
 * intentionally empty until Ahmed supplies his LinkedIn text — the section
 * renders nothing while the array is empty.
 */

export const profile = {
  name: 'Ahmed Ali Ghori',
  handle: 'AHMEDALIGHORI',
  roles: ['Frontend Developer', 'Data Analyst', 'WebGL & Motion'],
  github: 'https://github.com/AHMEDALIGHORI',
  linkedin: 'https://www.linkedin.com/in/ahmed-ali-ghori-85a24b338/',
  portfolio: 'https://ahmed-ali-portfolio-amber.vercel.app',
  email: 'ahmedalighori9@gmail.com',
  location: 'Hyderabad, Sindh, Pakistan',
  bio: 'Frontend-focused software engineer and applied AI builder — cinematic web interfaces, WebGL motion, and source-grounded AI.',
  avatar: './avatar.jpg',
  stats: [
    { key: 'repos', value: '117', label: 'public repositories' },
    { key: 'live', value: '30+', label: 'live deployments' },
    { key: 'faces', value: '5.5k', label: 'faces in this world' },
    { key: 'assets', value: '0', label: 'stock 3D assets' },
  ],
};

/**
 * Experience and education, transcribed from Ahmed's Profile.pdf
 * (LinkedIn export, read 19 Nov 2026). Wording follows the CV.
 */
export const experience = [
  {
    period: 'Feb 2024 — Jan 2026',
    role: 'Frontend Developer',
    org: 'Developer Hub Cooperative',
    note: 'Responsive React / Next.js / TypeScript interfaces, reusable components, REST API integration, cross-screen consistency through structured debugging.',
  },
  {
    period: 'Jan 2023 — Present',
    role: 'Frontend Web Developer',
    org: 'Developer Hub · Islamabad',
    note: 'Interface work across client builds — component systems, responsive layout, debugging.',
  },
];

export const education = [
  {
    period: 'Mar 2022 — Jul 2026',
    role: 'BS Computer Science',
    org: 'Iqra University — Computer Software Engineering',
    note: 'Data structures and algorithms in Python, web development, data analysis.',
  },
  {
    period: '',
    role: 'Schooling',
    org: 'Army Public School (APSACS)',
    note: '',
  },
];

export const certifications = [
  'AWS Generative AI Applications',
  'Snowflake Generative AI',
  'Snowflake Data Engineering',
  'Microsoft SQL Server Specialization',
];

/** Contact form: paste a Formspree/Getform endpoint to enable real submissions. */
export const contact = {
  endpoint: '',
  email: 'ahmedalighori9@gmail.com',
  note: 'The form opens your mail client with the message pre-filled.',
};

export const skills = [
  'Three.js',
  'WebGL',
  'GLSL',
  'React',
  'Next.js',
  'TypeScript',
  'GSAP',
  'ScrollTrigger',
  'Lenis',
  'Tailwind CSS',
  'Responsive design',
  'REST APIs',
  'Prompt engineering',
  'Blender',
  'Python',
  'Data analysis',
];

/** Stack filters used by the "More" chapter and the panel dimming. */
export const stackFilters = ['All', 'Three.js', 'React', 'TypeScript', 'Python', 'GSAP'];

/** Four projects get a floating panel in the 3D world, in walk order. */
export const featured = [
  {
    id: 'logoff',
    index: '01',
    title: 'LOGOFF-01 / Touch Grass',
    year: '2026',
    tagline: 'A sneaker that does not exist.',
    body: 'A fully procedural three.js product page: one shoe, seven labelled parts, four colourways, 171 hex lugs — zero runtime images or models. Scroll to take it apart.',
    stack: ['three.js', 'Procedural', 'No build step'],
    tags: ['Three.js', 'GSAP'],
    live: 'https://logooff-01-touch-grass.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/LOGOFF-01-Touch-Grass',
    image: './work/logoff.jpg',
    caseStudy: {
      summary:
        'A product page for a shoe that only exists as geometry. Every lug, stitch and colourway is generated at runtime — the page ships no model files and no product photography.',
      role: 'Design, 3D and front-end',
      highlights: [
        'One shoe assembled from seven labelled parts that separate as you scroll',
        'Four colourways driven by a single material parameter set',
        '171 hex lugs generated procedurally rather than modelled by hand',
        'Zero runtime images or model downloads — the whole product is code',
      ],
      metrics: [
        { value: '0', label: 'runtime images' },
        { value: '7', label: 'labelled parts' },
        { value: '4', label: 'colourways' },
        { value: '171', label: 'generated lugs' },
      ],
      stack: ['three.js r186', 'Procedural geometry', 'Scroll choreography', 'No build step'],
    },
  },
  {
    id: 'neon',
    index: '02',
    title: 'Neon: The Next Interface',
    year: '2026',
    tagline: 'A product launch that is secretly a film.',
    body: 'A scroll-driven WebGL film with seven chapters and one living interface. Everything is procedural — no stock 3D, custom GLSL throughout.',
    stack: ['React', 'Three.js', 'GSAP', 'GLSL'],
    tags: ['React', 'Three.js', 'GSAP'],
    live: 'https://neon-the-next-interface.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/neon-the-next-interface',
    image: './work/neon.jpg',
    caseStudy: {
      summary:
        'A launch page structured as a seven-chapter film. Scroll position is the timeline; the interface itself is the product being shown.',
      role: 'Concept, 3D and front-end',
      highlights: [
        'Seven chapters sequenced on one scroll timeline with GSAP ScrollTrigger',
        'Custom GLSL for the surface and light behaviour',
        'Lenis smoothing keeps the camera path continuous between chapters',
        'No stock 3D — every object is generated in code',
      ],
      metrics: [
        { value: '7', label: 'chapters' },
        { value: '1', label: 'continuous timeline' },
        { value: '0', label: 'stock 3D assets' },
      ],
      stack: ['React', 'Three.js', 'GSAP ScrollTrigger', 'Lenis', 'Custom GLSL'],
    },
  },
  {
    id: 'mithaas',
    index: '03',
    title: 'Mithaas Co.',
    year: '2026',
    tagline: 'A Diwali mithai shop, built as a template.',
    body: 'A gold gift box opens as you scroll, six sweets break apart in slow motion, and the page melts into oxblood-black. Static HTML, CSS and JS with GSAP and Lenis — no build step.',
    stack: ['GSAP', 'Lenis', 'Canvas', 'No build step'],
    tags: ['GSAP'],
    live: 'https://ahmedalighori.github.io/mithaas-co/',
    code: 'https://github.com/AHMEDALIGHORI/mithaas-co',
    image: './work/mithaas.jpg',
    caseStudy: {
      summary:
        'A premium mithai shop template where a gold gift box opens under scroll control and six sweets separate in slow motion, ending on a single oxblood-black frame.',
      role: 'Design and front-end',
      highlights: [
        'Scroll-scrubbed video scrubbing bound to a canvas sequence',
        'Six sweets choreographed to separate on one continuous timeline',
        'Static HTML/CSS/JS — deployable to GitHub Pages with no build step',
        'GSAP for the timeline, Lenis for smooth scroll',
      ],
      metrics: [
        { value: '6', label: 'sweets choreographed' },
        { value: '0', label: 'build steps' },
        { value: '1', label: 'hero composition' },
      ],
      stack: ['HTML/CSS/JS', 'GSAP', 'Lenis', 'Canvas video scrubbing'],
    },
  },
  {
    id: 'mudra',
    index: '04',
    title: 'MUDRA · House of the Thali',
    year: '2026',
    tagline: 'An editorial experience where spice becomes story.',
    body: 'A scroll-controlled editorial build: Three.js depth layers, handcrafted micro-interactions and type that carries the whole narrative.',
    stack: ['TypeScript', 'Three.js', 'Editorial'],
    tags: ['TypeScript', 'Three.js'],
    live: 'https://mudra-house-of-thali.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/mudra-house-of-thali',
    image: './work/mudra.jpg',
    caseStudy: {
      summary:
        'An interactive editorial about the thali: layered Three.js depth, scroll-controlled motion and handcrafted micro-interactions instead of a conventional restaurant menu.',
      role: 'Design and front-end',
      highlights: [
        'Depth-layered 3D scenes behind a typographic editorial grid',
        'Scroll-controlled narrative sections with handcrafted interactions',
        'Built in TypeScript with Three.js and a token-based type system',
      ],
      metrics: [
        { value: '3D', label: 'depth layers' },
        { value: '1', label: 'editorial grid' },
      ],
      stack: ['TypeScript', 'Three.js', 'Editorial layout', 'Motion'],
    },
  },
];

/** Everything else, straight from the repo descriptions. */
export const more = [
  {
    title: 'GHORI-CITY',
    note: 'Interactive 3D portfolio city — six districts, Three.js + Blender.',
    tags: ['Three.js', 'Blender'],
    live: 'https://ghori-city.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/GHORI-CITY',
  },
  {
    title: 'Astra Cosmos',
    note: 'Scroll-driven cosmic journey: procedural planets, constellations, a black hole.',
    tags: ['TypeScript', 'Three.js', 'React'],
    live: 'https://astra-cosmos.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/astra-cosmos',
  },
  {
    title: 'BR Buds',
    note: 'Luxury earbud launch film in code — Next.js, R3F, GSAP, custom GLSL.',
    tags: ['React', 'GSAP'],
    live: null,
    code: 'https://github.com/AHMEDALIGHORI/br-buds',
  },
  {
    title: 'Zenith X Headphones',
    note: 'Headphone product site with motion-led storytelling.',
    tags: ['TypeScript', 'React'],
    live: 'https://zenith-x-headphones-website.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/Zenith-X-Headphones-Website',
  },
  {
    title: 'Voice2Law',
    note: 'Ask by voice, snap documents, know your rights.',
    tags: ['Python'],
    live: 'https://locallanguage.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/Voice2Law-App',
  },
  {
    title: 'RozgarSync',
    note: 'AI orchestration for job matching, built in TypeScript.',
    tags: ['TypeScript'],
    live: 'https://rozgar-sync.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/RozgarSync',
  },
  {
    title: 'Wok Wave',
    note: 'Restaurant site with scroll-driven food animation and a photo-rich menu.',
    tags: ['TypeScript', 'GSAP'],
    live: 'https://wok-wave.vercel.app',
    code: 'https://github.com/AHMEDALIGHORI/wok-wave',
  },
  {
    title: 'Coke Studio Tribute',
    note: 'Cinematic, non-commercial tribute with a scroll-scrubbed film.',
    tags: ['GSAP'],
    live: null,
    code: 'https://github.com/AHMEDALIGHORI/Coke-Studio-Website',
  },
];

/** Chapter windows over scroll progress (0..1). Must stay in ascending order. */
export const chapters = [
  { id: 'hero', start: 0.0, end: 0.11 },
  { id: 'about', start: 0.11, end: 0.23 },
  { id: 'studio', start: 0.23, end: 0.34 },
  { id: 'project-0', start: 0.34, end: 0.47, featured: 0 },
  { id: 'project-1', start: 0.47, end: 0.6, featured: 1 },
  { id: 'project-2', start: 0.6, end: 0.72, featured: 2 },
  { id: 'project-3', start: 0.72, end: 0.84, featured: 3 },
  { id: 'more', start: 0.84, end: 0.93 },
  { id: 'contact', start: 0.93, end: 1.01 },
];
