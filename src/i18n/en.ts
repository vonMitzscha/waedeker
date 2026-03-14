import type { Translations } from './types';

const en = {
  hero: {
    pronunciation: '/ˈveːdəkɐ/',
    slogan: 'Wikipedia\'s knowledge in a handy Baedeker format',
    description:
      'Create a compact, offline-usable Wikipedia archive as a ZIM file for any region in the world – perfect for hikes, expeditions, or areas without network coverage.',
    ctaStart: 'Select area',
    ctaExplainLabels: ['What can I do here?', 'What is a ZIM file?'],
    impressumLink: 'Legal Notice',
    steps: [
      {
        num: '01',
        title: 'Choose area',
        desc: 'Draw a point with radius, a rectangle, a polygon on the map, or upload a GPX file of a route.',
      },
      {
        num: '02',
        title: 'Configure contents',
        desc: 'Specify wiki language, images, link depth and article categories – only what you actually need.',
      },
      {
        num: '03',
        title: 'Build locally',
        desc: 'Download the configuration and follow a guided few steps to build a ZIM file with Docker on your computer.',
      },
    ],
  },

  impressum: {
    title: 'Legal Notice',
    badge: 'Conceived by HI・Made with AI',
    back: 'Back',
    sections: {
      identity: { heading: 'Responsibe' },
      contact: { heading: 'Contact' },
      liability: {
        heading: 'Liability for content',
        body: 'This is a private, non-commercial website. Under Austrian law (ECG), private websites are not subject to a mandatory legal notice requirement. The information provided here is voluntary. Responsibility is assumed for own content in accordance with general law; there is no obligation to monitor third-party content.',
      },
      links: {
        heading: 'Liability for links',
        body: 'This website contains links to external third-party websites over whose content there is no control. Therefore no liability can be accepted for this external content. The respective provider or operator of the linked pages is always responsible for their content.',
      },
      copyright: {
        heading: 'Copyright',
        body: 'The content and works created on this website are subject to Austrian copyright law. Duplication, processing, distribution, or any form of commercialization of such material beyond the scope of copyright law requires the written consent of the creator.',
      },
      sources: {
        heading: 'Data sources',
        body: 'Geodata and maps: © OpenStreetMap contributors. Article data: Wikidata / Wikipedia, licensed under CC BY-SA 4.0. ZIM files are built locally using OpenZIM tools.',
      },
    },
  },

  explain: {
    back: 'Back',
    heading: 'What can Waedeker do?',
    sections: [
      {
        title: 'What is a ZIM file?',
        body: 'ZIM (Zeno IMproved) is an open archive format that packages entire websites – including all articles, images and links – into a single compressed file. Wikipedia, Wiktionary or other wikis can be saved as a handy file and used completely without an internet connection.',
      },
      {
        title: 'Kiwix – on almost any device',
        body: 'Kiwix is the free reader for ZIM files and runs on Windows, macOS, Linux, Android, iOS and even as a browser extension. Once downloaded, Kiwix opens your ZIM file as a fully navigable Wikipedia – with search, links and images – without any Wi-Fi or mobile data.',
      },
      {
        title: 'Why is this useful?',
        body: 'Whether hiking, on an expedition, or travelling to regions with poor network coverage – with Waedeker you create a tailor-made Wikipedia archive for exactly your area. No unnecessary data, no mobile internet needed: all relevant Wikipedia articles ready on your device.',
      },
    ],
    kiwixNote: 'Kiwix is free and open-source.',
    ctaStart: 'Got it – select area',
  },

  modeSelect: {
    step: 'Step 1',
    heading: 'How do you define',
    headingItalic: 'your area?',
    description: 'Choose a method to define the geographic area for your Wikipedia archive.',
    available: 'Available',
    select: 'Select',
    modes: [
      {
        title: 'Point + Radius',
        desc: 'Choose a location or address and define a radius in kilometres.',
      },
      {
        title: 'Rectangle',
        desc: 'Draw a rectangle on the map to define a rectangular area.',
      },
      {
        title: 'Free Polygon',
        desc: 'Draw any shape on the map to outline a custom area.',
      },
      {
        title: 'Route + Buffer',
        desc: 'Import a GPX file and define a buffer zone along the route.',
      },
    ],
  },

  mapSelection: {
    searchPlaceholder: 'Search location or address…',
    backAriaLabel: 'Back',
    hint: 'Tap the map to set the center point',
    radiusLabel: 'Radius:',
    ctaConfirm: 'Confirm selection',
  },

  config: {
    stepLabels: ['Language', 'Contents'],
    stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
    back: 'Back',
    langStep: {
      heading: 'In which language?',
      description: 'Choose the Wikipedia language edition for your archive.',
      searchPlaceholder: 'Search language…',
      noResult: 'No language found',
      common: 'Common',
      moreLangs: (n: number) => `More languages (${n})`,
    },
    contentStep: {
      heading: 'What should be included?',
      description: 'More content means a larger ZIM file.',
      images: {
        label: 'Include images',
        desc: 'Increases file size by about 4×, but makes articles much more visual.',
      },
      linkDepth: {
        label: 'Link depth',
        descriptions: [
          'Only direct geo-articles – fastest build.',
          'Directly linked pages are also included.',
          'Two link levels – recommended for comprehensive archives.',
          'Three levels – very extensive, file size may increase significantly.',
        ],
      },
      hint: 'Exact article count and file size are shown after the Wikidata query. You can also refine the results by category there.',
    },
    next: 'Next',
    backFirst: 'Choose a new area',
    submit: 'Query Wikidata',
    selectionLabels: {
      polygon: (n: number) => `Polygon (${n} points)`,
      rectangle: 'Rectangle',
      route: 'Route',
    },
  },

  loading: {
    heading: 'Querying Wikidata',
    description: 'We are searching for all Wikipedia articles with geographic coordinates in your area.',
    steps: [
      'Connecting to Wikidata…',
      'Searching geotagged articles…',
      'Filtering by categories…',
      'Calculating file size…',
      'Preparing preview…',
    ],
    linkDepthProgress: (d: number, total: number) => `Following links – level ${d}/${total}…`,
  },

  results: {
    badges: {
      success: 'Query successful',
      empty: 'No results',
      filtered: (n: number) => `Filtered by ${n} categor${n !== 1 ? 'ies' : 'y'}`,
    },
    heading: {
      success: 'Data package is ready',
      empty: 'No articles found',
    },
    stats: {
      articles: 'Articles',
      viaLinks: 'Via Links',
      viaLinksDesc: (n: number) => `Additional\nArticles (depth ${n})`,
      size: 'Size (approx.)',
    },
    map: {
      area: 'Area',
      articles: 'Articles',
    },
    successMsg: (n: number) => `Wikidata found ${n.toLocaleString('en')} geotagged Wikipedia articles in your area.`,
    emptyMsg: 'Try a larger radius, a different language, or remove category filters.',
    tabs: {
      overview: 'Overview',
      articles: (n: number) => `Articles (${n.toLocaleString('en')})`,
    },
    zip: {
      heading: 'Included in the ZIP archive',
      articlesTxt: (n: number) => `${n.toLocaleString('en')} article titles`,
      descDockerCompose: 'Recommended build method',
      descBuildSh: 'Shell script as alternative',
      descReadme: 'Step-by-step guide',
    },
    nextSteps: {
      heading: 'Next steps',
      steps: [
        'Download and unzip the ZIP file',
        'Install and start Docker Desktop',
        'Run docker compose up && docker compose down in the unzipped folder',
        'Open the ZIM file in ./output/ with Kiwix',
      ],
    },
    search: {
      placeholder: 'Search articles…',
      count: (found: number, total: number) => `${found.toLocaleString('en')} of ${total.toLocaleString('en')} articles found`,
      noResults: 'No articles found',
    },
    categories: {
      filterButton: 'Refine results by categories',
      heading: 'Categories',
      instruction: 'Select categories to retrieve only articles of those types. Without a selection, all articles are included.',
      searchPlaceholder: 'Search categories…',
      selectAll: 'All ✓',
      deselectAll: 'None ✗',
      loadingMsg: 'Loading categories…',
      error: 'Error loading categories. Please try again.',
      noCategories: 'No categories found for this query.',
      applySelected: (n: number) => `Apply ${n} categor${n !== 1 ? 'ies' : 'y'}`,
      applyAll: 'Show all categories',
    },
    ctaConfig: 'Edit configuration',
    ctaDownload: 'Download ZIP',
    ctaDownloading: 'Creating…',
    ctaDownloaded: 'Downloaded!',
    ctaNewArea: 'Choose a different area',
    ctaShowGuide: 'Show step-by-step guide',
    mobileWarning: {
      heading: 'Docker only runs on computers',
      body: 'To build the ZIM file, you need Docker on a Mac, Windows PC, or Linux computer. Docker cannot run on smartphones or tablets.',
      ctaAnyway: 'Download anyway',
      ctaShare: 'Send configuration to computer',
      ctaShareCopied: 'Link copied ✓',
      ctaCancel: 'Cancel',
    },
  },

  setupGuide: {
    nav: {
      close: 'Close',
      back: 'Back',
      next: 'Next',
      done: 'Done!',
      stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
      stepLabel: (n: number) => `Step ${n}`,
    },
    os: {
      mac: 'macOS',
      windows: 'Windows',
      linux: 'Linux',
    },
    placeholder: 'Placeholder',
    steps: {
      unzip: {
        title: 'Unzip the archive',
        p1: 'You just saved a ZIP file to your Downloads folder. Open your Downloads folder and double-click the file.',
        p2: 'A new folder will automatically be created with these files inside:',
        p3: 'Remember where this folder is – you will need it shortly.',
        tipLabel: 'Where are my Downloads?',
        tipMacLinux: '~/Downloads (macOS/Linux)',
        tipWindows: 'C:\\Users\\Your Name\\Downloads (Windows)',
      },
      docker: {
        title: 'Install Docker Desktop',
        intro: 'Docker is the program that downloads all Wikipedia articles in the background and builds the ZIM file. It is free and only needs to be installed once.',
        dockerLink: 'docker.com/products/docker-desktop',
        mac: {
          download: 'Download Docker Desktop for Mac:',
          instructions: 'Open the downloaded .dmg file and drag the Docker icon into the Applications folder. On first launch macOS will ask for your password – that is normal.',
          tip: 'Does your Mac have an Apple chip (M1/M2/M3/M4) or Intel? On the download page choose Apple Silicon for newer Macs or Intel Chip for older ones. If unsure: Apple menu → About This Mac → Chip.',
        },
        windows: {
          download: 'Download Docker Desktop for Windows:',
          instructions: 'Run the downloaded .exe file and follow the installation wizard. A restart of the computer may be required.',
          tip: 'Windows requires the "WSL 2" feature. Docker will automatically suggest installing it – just click "Install" and follow the steps.',
        },
        linux: {
          download: 'Download Docker Desktop for Linux:',
          alt: 'Alternatively, Docker Engine can be installed directly. For Ubuntu/Debian in the terminal:',
          tip: 'For other distributions you can find instructions at docs.docker.com/engine/install.',
        },
      },
      dockerStart: {
        title: 'Start Docker Desktop',
        intro: 'Docker must be running before we start the build. Open Docker Desktop now:',
        mac: {
          p1: 'Open Launchpad or the Applications folder and start Docker.',
          p2: 'Alternatively: open Spotlight (⌘ Space), type "Docker" and press Enter.',
        },
        windows: {
          p: 'Open the Start menu, search for "Docker Desktop" and click it.',
        },
        linux: {
          p: 'Start Docker Desktop via the application menu, or start Docker Engine in the terminal:',
        },
        final: 'Wait until the Docker icon in the menu bar is still and no longer animated. That means Docker is ready.',
        finalWindows: 'Wait until the Docker icon in the taskbar is still and no longer animated. That means Docker is ready.',
        tip: 'On first launch Docker downloads some data – this can take 2–5 minutes. Docker must stay open throughout the entire build process.',
      },
      terminal: {
        title: 'Open a terminal',
        intro: 'The terminal is a text input window where we enter the build command. Sounds technical but is easy – you only need to type a single command.',
        mac: {
          heading: 'How to open the terminal on Mac:',
          steps: [
            'Press ⌘ Space to open Spotlight',
            'Type "Terminal" and press Enter',
            'A black or white window with a cursor will open',
          ],
        },
        windows: {
          heading: 'How to open PowerShell on Windows:',
          steps: [
            'Press the Windows key',
            'Type "PowerShell"',
            'Click "Windows PowerShell" in the search results',
          ],
        },
        linux: {
          p: 'Open your terminal application. Depending on your desktop environment: GNOME Terminal, Konsole (KDE) or Ctrl + Alt + T.',
        },
      },
      navigate: {
        title: 'Navigate to the folder',
        intro: 'The terminal needs to "know" where your unzipped folder is. The easiest way:',
        mac: {
          steps: [
            'Type cd  in the terminal (with a space after it, do not press Enter yet)',
            'Open Finder and navigate to the unzipped folder',
            'Drag the folder from Finder directly into the terminal window – the path will be inserted automatically',
            'Press Enter',
          ],
          tip: 'Alternatively: right-click the unzipped folder in Finder → "New Terminal Tab at Folder" (may need to be enabled in Finder settings).',
        },
        windows: {
          steps: [
            'Open the unzipped folder in Explorer',
            'Hold Shift and right-click on an empty spot in the folder',
            'Click "Open PowerShell window here"',
          ],
          tip: 'A PowerShell window will automatically open that is already in the correct folder.',
        },
        linux: {
          steps: [
            'Open the unzipped folder in the file manager',
            'Right-click on an empty spot',
            'Click "Open Terminal" or "Open in Terminal"',
          ],
          tip: 'Alternatively in the terminal: type cd  then drag & drop the folder into the terminal window.',
        },
      },
      build: {
        title: 'Start the build',
        p1: 'Now comes the only command you need to enter. Type it in the terminal and press Enter:',
        p2: 'Docker will now start the entire process automatically – and clean up the container afterwards:',
        bullets: [
          'Downloading the required programs',
          'Fetching all Wikipedia articles from your list',
          'Assembling the ZIM file',
        ],
        tip: 'You will see many lines of text in the terminal – that is normal and shows progress. The computer must stay on and connected to the internet until the process is complete.',
      },
      wait: {
        title: 'Wait for completion',
        p1: 'The build is now running in the background. Depending on the number of articles and internet speed this can take several hours. You can use the computer for other things in the meantime – just leave the terminal open.',
        p2: 'When the process is complete, a message like this will appear in the terminal:',
        p3: 'The finished ZIM file is located in the output/ subfolder of your unzipped folder.',
        tip: 'Interrupt the process with Ctrl + C and resume later with docker compose up && docker compose down – Docker will continue from where it left off.',
      },
      kiwix: {
        title: 'Open ZIM file with Kiwix',
        p1: 'You can open the finished ZIM file with Kiwix – a free program that makes Wikipedia and other content fully readable offline.',
        apps: {
          desktop: 'Desktop (Win/Mac/Linux)',
          android: 'Android',
          ios: 'iPhone/iPad',
          browser: 'Browser Extension',
        },
        p2: 'In Kiwix: File → Open ZIM file → select your .zim file in the output/ folder. Done!',
        tip: 'Kiwix can also serve the ZIM file as a local web server so you can access it on other devices on the same Wi-Fi – perfect for travel or areas without internet.',
      },
    },
  },

  polygonOverlay: {
    searchPlaceholder: 'Search location or address…',
    backAriaLabel: 'Back',
    hint: {
      closed: (n: number) => `Polygon closed · ${n} points`,
      empty: 'Tap the map to draw the polygon',
      tooFew: (n: number) => `${n} point${n > 1 ? 's' : ''} set – at least 3 needed`,
      drawing: (n: number) => `${n} points · Tap first point or double-click to close`,
    },
    undo: 'Undo',
    reset: 'Reset',
    statusReady: 'Polygon ready',
    statusPoints: (n: number) => `${n} point${n !== 1 ? 's' : ''}`,
    statusEmpty: 'No polygon drawn',
    ctaConfirm: 'Confirm selection',
  },

  rectangleOverlay: {
    searchPlaceholder: 'Search location or address…',
    backAriaLabel: 'Back',
    hint: {
      confirmed: 'Rectangle confirmed',
      firstCorner: 'Click the map to set the first corner',
      secondCorner: 'Click second corner to draw the rectangle',
    },
    reset: 'Reset',
    statusReady: 'Rectangle ready',
    statusFirstCorner: 'First corner set',
    statusEmpty: 'No rectangle drawn',
    ctaConfirm: 'Confirm selection',
  },

  gpxOverlay: {
    backAriaLabel: 'Back',
    back: 'Back',
    bufferLabel: 'Buffer:',
    heading: 'Load route',
    subheadingReady: (km: number, filename: string) => `Route loaded · ${km.toFixed(1)} km · ${filename}`,
    subheadingIdle: 'Import a GPX file or paste a map link.',
    dropzone: {
      dragging: 'Drop GPX file here',
      idle: 'Drop GPX file here',
      sub: 'or click to select',
    },
    loadingRoute: 'Loading route…',
    routeReady: 'Route ready',
    loadNewRoute: 'Load new route',
    howToGetGpx: 'How do I get a GPX file?',
    google: {
      description: 'Share a route in Google Maps via the share icon and paste the link here – short links (maps.app.goo.gl) are also supported.',
      note: 'Note: Google Maps only passes on waypoints, not the exact route path. The result is a calculated approximate route. Alternatively mapstogpx.com can generate a more precise GPX file.',
      placeholder: 'https://maps.app.goo.gl/… or maps.google.com/…',
      loadButton: 'Load route',
    },
    apple: {
      description: 'Apple Maps currently does not offer direct GPX export for routes. Share your route via the share icon, paste the link here – we will determine the waypoints and calculate the route.',
      note: 'Note: Apple Maps only passes on start and destination, not the exact route path. The result is a calculated approximate route.',
      placeholder: 'https://maps.apple.com/…',
      loadButton: 'Load route',
    },
    mapy: {
      heading: 'Export GPX directly',
      steps: [
        'In Mapy.cz: Plan route → Menu → Save as GPX',
        'In OpenStreetMap / uMap: Export route → choose GPX format',
        'In Komoot / Outdooractive: Open tour → Export → Download GPX',
        'Drag the GPX file into the dropzone above or click to select',
      ],
    },
    ctaConfirm: 'Confirm selection',
    errors: {
      noWaypoints: 'No waypoints found in the GPX file.',
      parseError: 'The GPX file could not be read.',
      readError: 'Error reading the file.',
      linkExtractError: 'The route could not be extracted from the link. Please try with a GPX file.',
      singleLocationError: 'This link shows only a single location, not a route. Please export the route as a GPX file.',
      startDestNotFound: 'Start or destination could not be found. Please try with a GPX file.',
      oneWaypointOnly: 'Only one waypoint was found. Please provide at least a start and destination.',
    },
  },
} satisfies Translations;

export default en;
