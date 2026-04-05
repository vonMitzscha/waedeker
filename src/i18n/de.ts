import type { Translations } from './types';

const de = {
  hero: {
    pronunciation: '/ˈveːdəkɐ/',
    slogan: 'Das Wissen Wikipedias im handlichen Baedeker-Format',
    description:
      'Erstelle ein kompaktes offline verwendbares Wikipedia-Archiv als ZIM-Datei für jede beliebige Region der Welt – perfekt für Wanderungen, Expeditionen oder Gebiete ohne Netzabdeckung.',
    ctaStart: 'Gebiet auswählen',
    ctaExplainLabels: ['Was kann ich hier tun?', 'Was ist eine ZIM-Datei?'],
    impressumLink: 'Impressum',
    steps: [
      {
        num: '01',
        title: 'Gebiet wählen',
        desc: 'Zeichne einen Punkt mit Radius, ein Rechteck, ein Polygon auf der Karte oder lade die GPX-Datei einer Route hoch.',
      },
      {
        num: '02',
        title: 'Inhalte konfigurieren',
        desc: 'Wikisprache, Bilder, Linktiefe und Artikel-Kategorien spezifizieren – nur das, was wirklich nötig ist.',
      },
      {
        num: '03',
        title: 'Lokal bauen',
        desc: 'Lade die Konfiguration herunter und baue in in wenigen Schritten angeleitet eine ZIM-Datei mit Docker auf deinem Rechner.',
      },
    ],
  },

  impressum: {
    title: 'Impressum',
    badge: 'Vom Menschen erdacht・Mit Maschine gemacht',
    back: 'Zurück',
    sections: {
      identity: { heading: 'Verantwortlich' },
      contact: { heading: 'Kontakt' },
      liability: {
        heading: 'Haftung für Inhalte',
        body: 'Diese Website ist eine private, nicht-kommerzielle Website. In Österreich besteht für solche Websites keine gesetzliche Impressumspflicht nach dem ECG. Die Angaben auf dieser Seite erfolgen freiwillig. Für eigene Inhalte wird nach allgemeinen Gesetzen Verantwortung übernommen; eine Verpflichtung zur Überwachung fremder Inhalte besteht nicht.',
      },
      links: {
        heading: 'Haftung für Links',
        body: 'Diese Website enthält Links zu externen Websites Dritter, auf deren Inhalte kein Einfluss besteht. Für diese fremden Inhalte kann daher keine Gewähr übernommen werden. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.',
      },
      copyright: {
        heading: 'Urheberrecht',
        body: 'Die selbst erstellten Inhalte und Werke auf dieser Website unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des Erstellers.',
      },
      sources: {
        heading: 'Datenquellen',
        body: 'Geodaten und Karten: © OpenStreetMap-Mitwirkende. Artikeldaten: Wikidata / Wikipedia, lizenziert unter CC BY-SA 4.0. ZIM-Dateien werden lokal mit OpenZIM-Tools gebaut.',
      },
    },
  },

  explain: {
    back: 'Zurück',
    heading: 'Was kann Waedeker?',
    sections: [
      {
        title: 'Was ist eine ZIM-Datei?',
        body: 'ZIM (Zeno IMproved) ist ein offenes Archivformat, das ganze Websites – inklusive aller Artikel, Bilder und Verlinkungen – in eine einzige komprimierte Datei verpackt. Wikipedia, Wiktionary oder andere Wikis lassen sich so als handliche Datei speichern und vollständig ohne Internetverbindung nutzen.',
      },
      {
        title: 'Kiwix – auf fast jedem Gerät',
        body: 'Kiwix ist der freie Reader für ZIM-Dateien und läuft auf Windows, macOS, Linux, Android, iOS und sogar als Browser-Extension. Einmal heruntergeladen, öffnet Kiwix deine ZIM-Datei als vollständig navigierbares Wikipedia – mit Suche, Links und Bildern – ganz ohne WLAN oder Mobilfunk.',
      },
      {
        title: 'Warum ist das praktisch?',
        body: 'Ob Fernwanderung, Expedition oder Reise in Regionen mit schlechter Netzabdeckung – mit Waedeker erstellst du ein maßgeschneidertes Wikipedia-Archiv genau für dein Gebiet. Keine unnötigen Daten, kein mobiles Internet nötig: alle relevanten Wikipedia-Artikel griffbereit auf deinem Gerät.',
      },
    ],
    kiwixNote: 'Kiwix ist kostenlos und open-source.',
    ctaStart: 'Verstanden – Gebiet auswählen',
  },

  modeSelect: {
    step: 'Schritt 1',
    heading: 'Wie definierst du',
    headingItalic: 'dein Gebiet?',
    description: 'Wähle eine Methode, um den geografischen Bereich für dein Wikipedia-Archiv festzulegen.',
    available: 'Verfügbar',
    newBadge: 'Neu',
    select: 'Auswählen',
    modes: [
      {
        title: 'Punkt + Radius',
        desc: 'Wähle einen Ort oder eine Adresse und definiere einen Umkreis in Kilometern.',
      },
      {
        title: 'Rechteck',
        desc: 'Spanne ein Rechteck auf der Karte auf, um ein rechteckiges Gebiet zu definieren.',
      },
      {
        title: 'Freies Polygon',
        desc: 'Zeichne eine beliebige Fläche auf der Karte, um ein individuelles Gebiet zu umreißen.',
      },
      {
        title: 'Route + Puffer',
        desc: 'Importiere eine GPX-Datei und definiere eine Pufferzone entlang der Route.',
      },
      {
        title: 'Verwaltungsgebiet',
        desc: 'Suche nach Städten, Gemeinden, Bundesländern oder Ländern und nutze deren OSM-Grenzen als Auswahlbereich.',
      },
    ],
  },

  mapSelection: {
    searchPlaceholder: 'Ort oder Adresse suchen…',
    backAriaLabel: 'Zurück',
    hint: 'Tippe auf die Karte, um den Mittelpunkt zu setzen',
    radiusLabel: 'Radius:',
    ctaConfirm: 'Auswahl bestätigen',
  },

  config: {
    stepLabels: ['Sprache', 'Inhalte'],
    stepOf: (current: number, total: number) => `Schritt ${current} von ${total}`,
    back: 'Zurück',
    langStep: {
      heading: 'In welcher Sprache?',
      description: 'Wähle die Wikipedia-Sprachversion für dein Archiv.',
      searchPlaceholder: 'Sprache suchen…',
      noResult: 'Keine Sprache gefunden',
      common: 'Gebräuchlich',
      moreLangs: (n: number) => `Weitere Sprachen (${n})`,
    },
    contentStep: {
      heading: 'Was soll enthalten sein?',
      description: 'Mehr Inhalte bedeuten eine größere ZIM-Datei.',
      images: {
        label: 'Bilder einschließen',
        desc: 'Erhöht die Dateigröße ca. 4×, macht Artikel aber deutlich anschaulicher.',
      },
      linkDepth: {
        label: 'Linktiefe',
        descriptions: [
          'Nur direkte Geo-Artikel – schnellster Build.',
          'Direkt verlinkte Seiten werden ebenfalls aufgenommen.',
          'Zwei Verlinkungsebenen – empfohlen für umfassende Archive.',
          'Drei Ebenen – sehr umfangreich, Dateigröße kann stark ansteigen.',
        ],
      },
      hint: 'Genaue Artikelanzahl und Dateigröße werden nach der Wikidata-Abfrage angezeigt. Dort kannst du die Ergebnisse auch noch nach Kategorien verfeinern.',
    },
    next: 'Weiter',
    backFirst: 'Neuen Ausschnitt wählen',
    submit: 'Wikidata abfragen',
    selectionLabels: {
      polygon: (n: number) => `Polygon (${n} Punkte)`,
      rectangle: 'Rechteck',
      route: 'Route',
      adminArea: 'Verwaltungsgebiet',
    },
  },

  loading: {
    heading: 'Wikidata wird befragt',
    description: 'Wir suchen alle Wikipedia-Artikel mit geografischen Koordinaten in deinem Gebiet.',
    linkDepthHint: 'Mit aktivierter Linktiefe werden alle verlinkten Artikel vollständig ermittelt – das kann je nach Gebietsgröße einige Minuten dauern.',
    steps: [
      'Verbinde mit Wikidata…',
      'Suche geogetaggte Artikel…',
      'Filtere nach Kategorien…',
      'Berechne Dateigröße…',
      'Bereite Vorschau vor…',
    ],
    linkDepthProgress: (d: number, total: number) => `Verlinkungen verfolgen – Ebene ${d}/${total}…`,
  },

  results: {
    badges: {
      success: 'Abfrage erfolgreich',
      empty: 'Keine Treffer',
      filtered: (n: number) => `Gefiltert nach ${n} Kategorie${n !== 1 ? 'n' : ''}`,
    },
    heading: {
      success: 'Datenpaket ist gepackt',
      empty: 'Keine Artikel gefunden',
    },
    stats: {
      articles: 'Artikel',
      viaLinks: 'Via Links',
      viaLinksDesc: (n: number) => `Zusätzliche\nArtikel (Tiefe ${n})`,
      size: 'Größe (ca.)',
    },
    map: {
      area: 'Gebiet',
      articles: 'Artikel',
    },
    successMsg: (n: number) => `Wikidata hat ${n.toLocaleString('de')} geogetaggte Wikipedia-Artikel in deinem Gebiet gefunden.`,
    emptyMsg: 'Versuche einen größeren Radius, eine andere Sprache oder entferne Kategorie-Filter.',
    tabs: {
      overview: 'Übersicht',
      articles: (n: number) => `Artikel (${n.toLocaleString('de')})`,
    },
    zip: {
      heading: 'Im ZIP-Archiv enthalten',
      articlesTxt: (n: number) => `${n.toLocaleString('de')} Artikel-Titel`,
      descDockerCompose: 'Empfohlene Build-Methode',
      descBuildSh: 'Shell-Skript als Alternative',
      descReadme: 'Schritt-für-Schritt-Anleitung',
    },
    nextSteps: {
      heading: 'Nächste Schritte',
      steps: [
        'ZIP herunterladen und entpacken',
        'Docker Desktop installieren und starten',
        'docker compose up && docker compose down im entpackten Ordner ausführen',
        'ZIM-Datei in ./output/ mit Kiwix öffnen',
      ],
    },
    search: {
      placeholder: 'Artikel suchen…',
      count: (found: number, total: number) => `${found.toLocaleString('de')} von ${total.toLocaleString('de')} Artikeln gefunden`,
      noResults: 'Keine Artikel gefunden',
    },
    categories: {
      filterButton: 'Ergebnisse nach Kategorien verfeinern',
      heading: 'Kategorien',
      instruction: 'Wähle Kategorien, um nur Artikel dieser Typen abzurufen. Ohne Auswahl werden alle Artikel eingeschlossen.',
      searchPlaceholder: 'Kategorien suchen…',
      selectAll: 'Alle ✓',
      deselectAll: 'Keine ✗',
      loadingMsg: 'Kategorien werden geladen…',
      error: 'Fehler beim Laden der Kategorien. Bitte versuche es erneut.',
      noCategories: 'Für diese Abfrage wurden keine Kategorien gefunden.',
      applySelected: (n: number) => `${n} Kategorie${n !== 1 ? 'n' : ''} anwenden`,
      applyAll: 'Alle Kategorien anzeigen',
    },
    ctaConfig: 'Konfiguration bearbeiten',
    ctaDownload: 'ZIP herunterladen',
    ctaDownloading: 'Wird erstellt…',
    ctaDownloaded: 'Heruntergeladen!',
    ctaNewArea: 'Anderen Bereich wählen',
    ctaShowGuide: 'Schritt-für-Schritt-Anleitung anzeigen',
    mobileWarning: {
      heading: 'Docker läuft nur auf Computern',
      body: 'Um die ZIM-Datei zu erstellen, benötigst du Docker auf einem Mac, Windows-PC oder Linux-Rechner. Auf Smartphones und Tablets kann Docker nicht ausgeführt werden.',
      ctaAnyway: 'Trotzdem herunterladen',
      ctaShare: 'Konfiguration an Computer senden',
      ctaShareCopied: 'Link kopiert ✓',
      ctaCancel: 'Abbrechen',
    },
  },

  setupGuide: {
    nav: {
      close: 'Schließen',
      back: 'Zurück',
      next: 'Weiter',
      done: 'Fertig!',
      stepOf: (n: number, total: number) => `Schritt ${n} von ${total}`,
      stepLabel: (n: number) => `Schritt ${n}`,
    },
    os: {
      mac: 'macOS',
      windows: 'Windows',
      linux: 'Linux',
    },
    placeholder: 'Platzhalter',
    steps: {
      unzip: {
        title: 'ZIP-Archiv entpacken',
        p1: 'Du hast gerade eine ZIP-Datei in deinen Downloads-Ordner gespeichert. Öffne deinen Download-Ordner und mache einen Doppelklick auf die Datei.',
        p2: 'Es entsteht automatisch ein neuer Ordner mit diesen Dateien darin:',
        p3: 'Merke dir, wo dieser Ordner liegt – du brauchst ihn gleich.',
        tipLabel: 'Wo sind meine Downloads?',
        tipMacLinux: '~/Downloads (macOS/Linux)',
        tipWindows: 'C:\\Users\\Dein Name\\Downloads (Windows)',
      },
      docker: {
        title: 'Docker Desktop installieren',
        intro: 'Docker ist das Programm, das im Hintergrund alle Wikipedia-Artikel herunterlädt und die ZIM-Datei baut. Es ist kostenlos und einmalig zu installieren.',
        dockerLink: 'docker.com/products/docker-desktop',
        mac: {
          download: 'Lade Docker Desktop für Mac herunter:',
          instructions: 'Öffne die heruntergeladene .dmg-Datei und ziehe das Docker-Symbol in den Programme-Ordner. Beim ersten Start fragt macOS nach dem Passwort – das ist normal.',
          tip: 'Dein Mac hat einen Apple-Chip (M1/M2/M3/M4) oder Intel? Wähle auf der Downloadseite Apple Silicon für neuere Macs oder Intel Chip für ältere. Im Zweifelsfall: Apple-Menü → Über diesen Mac → Chip.',
        },
        windows: {
          download: 'Lade Docker Desktop für Windows herunter:',
          instructions: 'Starte die heruntergeladene .exe-Datei und folge dem Installations-Assistenten. Ein Neustart des Computers kann erforderlich sein.',
          tip: 'Windows benötigt das „WSL 2"-Feature. Docker schlägt dessen Installation automatisch vor – einfach auf „Installieren" klicken und die Schritte befolgen.',
        },
        linux: {
          download: 'Lade Docker Desktop für Linux herunter:',
          alt: 'Alternativ kann Docker Engine direkt installiert werden. Für Ubuntu/Debian im Terminal:',
          tip: 'Für andere Distributionen findest du eine Anleitung auf docs.docker.com/engine/install.',
        },
      },
      dockerStart: {
        title: 'Docker Desktop starten',
        intro: 'Docker muss laufen, bevor wir den Build starten. Öffne Docker Desktop jetzt:',
        mac: {
          p1: 'Öffne Launchpad oder den Ordner Programme und starte Docker.',
          p2: 'Alternativ: Spotlight öffnen (⌘ Leertaste), „Docker" eingeben und Enter drücken.',
        },
        windows: {
          p: 'Öffne das Startmenü, suche nach „Docker Desktop" und klicke darauf.',
        },
        linux: {
          p: 'Starte Docker Desktop über das Anwendungsmenü, oder starte Docker Engine im Terminal:',
        },
        final: 'Warte, bis das Docker-Symbol in der Menüleiste ruhig steht und nicht mehr animiert ist. Das bedeutet: Docker ist bereit.',
        finalWindows: 'Warte, bis das Docker-Symbol in der Taskleiste ruhig steht und nicht mehr animiert ist. Das bedeutet: Docker ist bereit.',
        tip: 'Beim ersten Start lädt Docker einige Daten herunter – das kann 2–5 Minuten dauern. Docker muss für den gesamten Build-Prozess geöffnet bleiben.',
      },
      terminal: {
        title: 'Terminal öffnen',
        intro: 'Das Terminal ist ein Texteingabe-Fenster, in dem wir den Build-Befehl eingeben. Klingt technisch, ist aber einfach – du musst nur einen einzigen Befehl eintippen.',
        mac: {
          heading: 'So öffnest du das Terminal auf dem Mac:',
          steps: [
            'Drücke ⌘ Leertaste um Spotlight zu öffnen',
            'Tippe „Terminal" und drücke Enter',
            'Ein schwarzes oder weißes Fenster mit einem Cursor öffnet sich',
          ],
        },
        windows: {
          heading: 'So öffnest du PowerShell auf Windows:',
          steps: [
            'Drücke die Windows-Taste',
            'Tippe „PowerShell"',
            'Klicke auf „Windows PowerShell" in den Suchergebnissen',
          ],
        },
        linux: {
          p: 'Öffne dein Terminal-Programm. Je nach Desktop-Umgebung: GNOME Terminal, Konsole (KDE) oder Strg + Alt + T.',
        },
      },
      navigate: {
        title: 'In den Ordner navigieren',
        intro: 'Das Terminal muss „wissen", wo dein entpackter Ordner liegt. Der einfachste Weg:',
        mac: {
          steps: [
            'Tippe im Terminal cd  (mit einem Leerzeichen danach, noch nicht Enter drücken)',
            'Öffne den Finder, navigiere zum entpackten Ordner',
            'Ziehe den Ordner aus dem Finder direkt in das Terminal-Fenster – der Pfad wird automatisch eingefügt',
            'Drücke Enter',
          ],
          tip: 'Alternativ: Rechtsklick auf den entpackten Ordner im Finder → „Neue Terminal-Registerkarte beim Ordner öffnen" (ggf. in den Finder-Einstellungen aktivieren).',
        },
        windows: {
          steps: [
            'Öffne den entpackten Ordner im Explorer',
            'Halte Shift gedrückt und mache einen Rechtsklick auf eine freie Stelle im Ordner',
            'Klicke auf „PowerShell-Fenster hier öffnen"',
          ],
          tip: 'Es öffnet sich automatisch ein PowerShell-Fenster, das bereits im richtigen Ordner ist.',
        },
        linux: {
          steps: [
            'Öffne den entpackten Ordner im Dateimanager',
            'Mache einen Rechtsklick auf eine freie Stelle',
            'Klicke auf „Terminal öffnen" oder „Im Terminal öffnen"',
          ],
          tip: 'Alternativ im Terminal: cd tippen, dann den Ordner per Drag & Drop ins Terminalfenster ziehen.',
        },
      },
      build: {
        title: 'Build starten',
        p1: 'Jetzt kommt der einzige Befehl, den du eingeben musst. Tippe ihn ins Terminal und drücke Enter:',
        p2: 'Docker startet jetzt den gesamten Prozess automatisch – und räumt den Container danach selbst weg:',
        bullets: [
          'Herunterladen der benötigten Programme',
          'Abrufen aller Wikipedia-Artikel aus deiner Liste',
          'Zusammenbauen der ZIM-Datei',
        ],
        tip: 'Du siehst viele Textzeilen im Terminal – das ist normal und zeigt den Fortschritt. Der Computer muss eingeschaltet und mit dem Internet verbunden bleiben, bis der Prozess abgeschlossen ist.',
      },
      wait: {
        title: 'Auf Fertigstellung warten',
        p1: 'Der Build läuft jetzt im Hintergrund. Je nach Anzahl der Artikel und Internetgeschwindigkeit kann das mehrere Stunden dauern. Du kannst den Computer währenddessen für anderes nutzen – das Terminal einfach offen lassen.',
        p2: 'Wenn der Prozess abgeschlossen ist, erscheint im Terminal eine Meldung wie:',
        p3: 'Die fertige ZIM-Datei liegt im Unterordner output/ deines entpackten Ordners.',
        tip: 'Den Prozess mit Strg + C unterbrechen und später mit docker compose up && docker compose down fortsetzen – Docker macht an derselben Stelle weiter.',
      },
      kiwix: {
        title: 'ZIM-Datei mit Kiwix öffnen',
        p1: 'Die fertige ZIM-Datei kannst du mit Kiwix öffnen – einem kostenlosen Programm, das Wikipedia und andere Inhalte komplett offline lesbar macht.',
        apps: {
          desktop: 'Desktop (Win/Mac/Linux)',
          android: 'Android',
          ios: 'iPhone/iPad',
          browser: 'Browser-Erweiterung',
        },
        p2: 'In Kiwix: Datei → ZIM-Datei öffnen → deine .zim-Datei im output/-Ordner auswählen. Fertig!',
        tip: 'Kiwix kann die ZIM-Datei auch als lokalen Webserver bereitstellen, sodass du sie auf anderen Geräten im selben WLAN aufrufen kannst – perfekt für Reisen oder Gegenden ohne Internet.',
      },
    },
  },

  polygonOverlay: {
    searchPlaceholder: 'Ort oder Adresse suchen…',
    backAriaLabel: 'Zurück',
    hint: {
      closed: (n: number) => `Polygon geschlossen · ${n} Punkte`,
      empty: 'Tippe auf die Karte, um das Polygon zu zeichnen',
      tooFew: (n: number) => `${n} Punkt${n > 1 ? 'e' : ''} gesetzt – mindestens 3 nötig`,
      drawing: (n: number) => `${n} Punkte · Ersten Punkt antippen oder doppelklicken zum Schließen`,
    },
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    reset: 'Zurücksetzen',
    statusReady: 'Polygon bereit',
    statusPoints: (n: number) => `${n} Punkt${n !== 1 ? 'e' : ''}`,
    statusEmpty: 'Kein Polygon gezeichnet',
    ctaConfirm: 'Auswahl bestätigen',
  },

  rectangleOverlay: {
    searchPlaceholder: 'Ort oder Adresse suchen…',
    backAriaLabel: 'Zurück',
    hint: {
      confirmed: 'Rechteck bestätigt',
      firstCorner: 'Klicke auf die Karte, um die erste Ecke zu setzen',
      secondCorner: 'Zweite Ecke klicken, um das Rechteck aufzuziehen',
    },
    reset: 'Zurücksetzen',
    statusReady: 'Rechteck bereit',
    statusFirstCorner: 'Erste Ecke gesetzt',
    statusEmpty: 'Kein Rechteck gezeichnet',
    ctaConfirm: 'Auswahl bestätigen',
  },

  gpxOverlay: {
    backAriaLabel: 'Zurück',
    back: 'Zurück',
    bufferLabel: 'Puffer:',
    heading: 'Route laden',
    subheadingReady: (km: number, filename: string) => `Route geladen · ${km.toFixed(1)} km · ${filename}`,
    subheadingIdle: 'Importiere eine GPX-Datei oder füge einen Karten-Link ein.',
    dropzone: {
      dragging: 'GPX-Datei hierher ziehen',
      idle: 'GPX-Datei hierher ziehen',
      sub: 'oder klicken zum Auswählen',
    },
    loadingRoute: 'Route wird geladen…',
    routeReady: 'Route bereit',
    loadNewRoute: 'Neue Route laden',
    howToGetGpx: 'Wie bekomme ich eine GPX-Datei?',
    google: {
      description: 'Teile eine Route in Google Maps über das Teilen-Symbol und füge den Link hier ein – auch Kurz-Links (maps.app.goo.gl) werden unterstützt.',
      note: 'Hinweis: Google Maps gibt nur die Wegpunkte weiter, nicht den genauen Routenverlauf. Das Ergebnis ist eine berechnete Näherungsroute. Alternativ kann mapstogpx.com eine präzisere GPX-Datei erzeugen.',
      placeholder: 'https://maps.app.goo.gl/… oder maps.google.com/…',
      loadButton: 'Route laden',
    },
    apple: {
      description: 'Apple Maps bietet derzeit keinen direkten GPX-Export für Routen. Teile deine Route über das Teilen-Symbol, füge den Link hier ein – wir ermitteln die Wegpunkte und berechnen die Route.',
      note: 'Hinweis: Apple Maps gibt nur Start und Ziel weiter, nicht den genauen Routenverlauf. Das Ergebnis ist eine berechnete Näherungsroute.',
      placeholder: 'https://maps.apple.com/…',
      loadButton: 'Route laden',
    },
    mapy: {
      heading: 'GPX direkt exportieren',
      steps: [
        'In Mapy.cz: Route planen → Menü → Als GPX speichern',
        'In OpenStreetMap / uMap: Route exportieren → GPX-Format wählen',
        'In Komoot / Outdooractive: Tour öffnen → Export → GPX herunterladen',
        'GPX-Datei oben in die Dropzone ziehen oder per Klick auswählen',
      ],
    },
    ctaConfirm: 'Auswahl bestätigen',
    drawRoute: {
      button: 'Route annäherungsweise zeichnen',
      backAriaLabel: 'Zurück zur GPX-Auswahl',
      hint: {
        empty: 'Klicke auf die Karte, um Wegpunkte zu setzen',
        drawing: (n: number) => n === 1
          ? '1 Punkt gesetzt – mindestens einen weiteren setzen'
          : `${n} Punkte gesetzt`,
      },
      undo: 'Rückgängig',
      redo: 'Wiederholen',
      reset: 'Neu starten',
      statusEmpty: 'Noch keine Punkte gesetzt',
      statusReady: (n: number) => `${n} Punkte – Pfad bereit zur Bestätigung`,
      ctaConfirm: 'Pfad bestätigen',
    },
    errors: {
      noWaypoints: 'Keine Wegpunkte in der GPX-Datei gefunden.',
      parseError: 'Die GPX-Datei konnte nicht gelesen werden.',
      readError: 'Fehler beim Lesen der Datei.',
      linkExtractError: 'Die Route konnte nicht aus dem Link extrahiert werden. Bitte versuche es mit einer GPX-Datei.',
      singleLocationError: 'Dieser Link zeigt nur einen einzelnen Ort, keine Route. Bitte exportiere die Route als GPX-Datei.',
      startDestNotFound: 'Start- oder Zielort konnte nicht gefunden werden. Bitte versuche es mit einer GPX-Datei.',
      oneWaypointOnly: 'Es konnte nur ein Wegpunkt gefunden werden. Bitte mindestens Start und Ziel angeben.',
    },
  },

  adminAreaOverlay: {
    searchPlaceholder: 'Stadt, Gemeinde, Land oder Bundesland suchen…',
    backAriaLabel: 'Zurück',
    hint: 'Verwaltungsgebiet über die Suche auswählen',
    noSelectionHint: 'Noch kein Gebiet ausgewählt',
    ctaConfirm: 'Auswahl bestätigen',
    noResults: 'Kein Verwaltungsgebiet gefunden',
    addArea: 'Weiteres Gebiet hinzufügen',
    removeArea: 'Gebiet entfernen',
    combinedLabel: (labels: string[]) => labels.join(' + '),
  },
} satisfies Translations;

export default de;
