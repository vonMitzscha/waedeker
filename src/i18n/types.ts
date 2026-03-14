export type Locale = 'de' | 'en';

export interface Translations {
  hero: {
    pronunciation: string;
    slogan: string;
    description: string;
    ctaStart: string;
    ctaExplainLabels: [string, string];
    impressumLink: string;
    steps: [
      { num: string; title: string; desc: string },
      { num: string; title: string; desc: string },
      { num: string; title: string; desc: string },
    ];
  };

  impressum: {
    title: string;
    badge: string;
    back: string;
    sections: {
      identity: { heading: string };
      contact: { heading: string };
      liability: { heading: string; body: string };
      links: { heading: string; body: string };
      copyright: { heading: string; body: string };
      sources: { heading: string; body: string };
    };
  };

  explain: {
    back: string;
    heading: string;
    sections: [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
    kiwixNote: string;
    ctaStart: string;
  };

  modeSelect: {
    step: string;
    heading: string;
    headingItalic: string;
    description: string;
    available: string;
    select: string;
    modes: [
      { title: string; desc: string },
      { title: string; desc: string },
      { title: string; desc: string },
      { title: string; desc: string },
    ];
  };

  mapSelection: {
    searchPlaceholder: string;
    backAriaLabel: string;
    hint: string;
    radiusLabel: string;
    ctaConfirm: string;
  };

  config: {
    stepLabels: [string, string];
    stepOf: (current: number, total: number) => string;
    back: string;
    langStep: {
      heading: string;
      description: string;
      searchPlaceholder: string;
      noResult: string;
      common: string;
      moreLangs: (n: number) => string;
    };
    contentStep: {
      heading: string;
      description: string;
      images: {
        label: string;
        desc: string;
      };
      linkDepth: {
        label: string;
        descriptions: [string, string, string, string];
      };
      hint: string;
    };
    next: string;
    backFirst: string;
    submit: string;
    selectionLabels: {
      polygon: (n: number) => string;
      rectangle: string;
      route: string;
    };
  };

  loading: {
    heading: string;
    description: string;
    steps: [string, string, string, string, string];
    linkDepthProgress: (d: number, total: number) => string;
  };

  results: {
    badges: {
      success: string;
      empty: string;
      filtered: (n: number) => string;
    };
    heading: {
      success: string;
      empty: string;
    };
    stats: {
      articles: string;
      viaLinks: string;
      viaLinksDesc: (n: number) => string;
      size: string;
    };
    map: {
      area: string;
      articles: string;
    };
    successMsg: (n: number) => string;
    emptyMsg: string;
    tabs: {
      overview: string;
      articles: (n: number) => string;
    };
    zip: {
      heading: string;
      articlesTxt: (n: number) => string;
      descDockerCompose: string;
      descBuildSh: string;
      descReadme: string;
    };
    nextSteps: {
      heading: string;
      steps: [string, string, string, string];
    };
    search: {
      placeholder: string;
      count: (found: number, total: number) => string;
      noResults: string;
    };
    categories: {
      filterButton: string;
      heading: string;
      instruction: string;
      searchPlaceholder: string;
      selectAll: string;
      deselectAll: string;
      loadingMsg: string;
      error: string;
      noCategories: string;
      applySelected: (n: number) => string;
      applyAll: string;
    };
    ctaConfig: string;
    ctaDownload: string;
    ctaDownloading: string;
    ctaDownloaded: string;
    ctaNewArea: string;
    ctaShowGuide: string;
    mobileWarning: {
      heading: string;
      body: string;
      ctaAnyway: string;
      ctaShare: string;
      ctaShareCopied: string;
      ctaCancel: string;
    };
  };

  setupGuide: {
    nav: {
      close: string;
      back: string;
      next: string;
      done: string;
      stepOf: (n: number, total: number) => string;
      stepLabel: (n: number) => string;
    };
    os: {
      mac: string;
      windows: string;
      linux: string;
    };
    placeholder: string;
    steps: {
      unzip: {
        title: string;
        p1: string;
        p2: string;
        p3: string;
        tipLabel: string;
        tipMacLinux: string;
        tipWindows: string;
      };
      docker: {
        title: string;
        intro: string;
        dockerLink: string;
        mac: {
          download: string;
          instructions: string;
          tip: string;
        };
        windows: {
          download: string;
          instructions: string;
          tip: string;
        };
        linux: {
          download: string;
          alt: string;
          tip: string;
        };
      };
      dockerStart: {
        title: string;
        intro: string;
        mac: {
          p1: string;
          p2: string;
        };
        windows: {
          p: string;
        };
        linux: {
          p: string;
        };
        final: string;
        finalWindows: string;
        tip: string;
      };
      terminal: {
        title: string;
        intro: string;
        mac: {
          heading: string;
          steps: [string, string, string];
        };
        windows: {
          heading: string;
          steps: [string, string, string];
        };
        linux: {
          p: string;
        };
      };
      navigate: {
        title: string;
        intro: string;
        mac: {
          steps: [string, string, string, string];
          tip: string;
        };
        windows: {
          steps: [string, string, string];
          tip: string;
        };
        linux: {
          steps: [string, string, string];
          tip: string;
        };
      };
      build: {
        title: string;
        p1: string;
        p2: string;
        bullets: [string, string, string];
        tip: string;
      };
      wait: {
        title: string;
        p1: string;
        p2: string;
        p3: string;
        tip: string;
      };
      kiwix: {
        title: string;
        p1: string;
        apps: {
          desktop: string;
          android: string;
          ios: string;
          browser: string;
        };
        p2: string;
        tip: string;
      };
    };
  };

  // Polygon overlay
  polygonOverlay: {
    searchPlaceholder: string;
    backAriaLabel: string;
    hint: {
      closed: (n: number) => string;
      empty: string;
      tooFew: (n: number) => string;
      drawing: (n: number) => string;
    };
    undo: string;
    reset: string;
    statusReady: string;
    statusPoints: (n: number) => string;
    statusEmpty: string;
    ctaConfirm: string;
  };

  // Rectangle overlay
  rectangleOverlay: {
    searchPlaceholder: string;
    backAriaLabel: string;
    hint: {
      confirmed: string;
      firstCorner: string;
      secondCorner: string;
    };
    reset: string;
    statusReady: string;
    statusFirstCorner: string;
    statusEmpty: string;
    ctaConfirm: string;
  };

  // GPX overlay
  gpxOverlay: {
    backAriaLabel: string;
    back: string;
    bufferLabel: string;
    heading: string;
    subheadingReady: (km: number, filename: string) => string;
    subheadingIdle: string;
    dropzone: {
      dragging: string;
      idle: string;
      sub: string;
    };
    loadingRoute: string;
    routeReady: string;
    loadNewRoute: string;
    howToGetGpx: string;
    google: {
      description: string;
      note: string;
      placeholder: string;
      loadButton: string;
    };
    apple: {
      description: string;
      note: string;
      placeholder: string;
      loadButton: string;
    };
    mapy: {
      heading: string;
      steps: [string, string, string, string];
    };
    ctaConfirm: string;
    errors: {
      noWaypoints: string;
      parseError: string;
      readError: string;
      linkExtractError: string;
      singleLocationError: string;
      startDestNotFound: string;
      oneWaypointOnly: string;
    };
  };
}
