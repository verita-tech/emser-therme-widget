const URL = "https://www.emser-therme.de/";
const widgetSize = config.widgetFamily || "large";
const VERSION = "1.1.0";
const USER = "Verita-Tech";
const REPO = "emser-therme-widget";

let showExclamation = false;
await checkForUpdates();
const auslastung = await getAuslastung();
const widget = await createWidget(auslastung, widgetSize);

if (!config.runsInWidget) {
  await showPreview(widget, widgetSize);
}
Script.setWidget(widget);
Script.complete();

async function checkForUpdates() {
  const apiUrl = `https://api.github.com/repos/${USER}/${REPO}/releases/latest`;
  try {
    const req = new Request(apiUrl);
    const json = await req.loadJSON();
    if (!json.tag_name) return;
    const latest = json.tag_name.replace(/^v/, "");
    if (isMinorOrMajorUpdate(latest, VERSION)) {
      showExclamation = true;

      if (!config.runsInWidget) {
        let alert = new Alert();
        alert.title = "Update available!";
        alert.message = `A new version (${latest}) is available on GitHub.\nYour version: ${VERSION}`;
        alert.addAction("Open GitHub");
        alert.addCancelAction("Later");
        let response = await alert.present();
        if (response === 0) Safari.openInApp(json.html_url, false);
      }
    }
  } catch (e) {
    console.warn("Update check failed:", e);
    return false;
  }
}

function isMinorOrMajorUpdate(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  if ((pa[0]||0) > (pb[0]||0)) return true;
  if ((pa[0]||0) < (pb[0]||0)) return false;
  if ((pa[1]||0) > (pb[1]||0)) return true;
  return false;
}

async function getAuslastung() {
  try {
    const req = new Request(URL);
    const html = await req.loadString();
    const match = html.match(/<h3 class="bold mb-0">(\d+)%<\/h3>/);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function createWidget(auslastung, widgetSize) {
  const sizes = getSizes(widgetSize);
  const colors = getColors();

  const widget = new ListWidget();
  widget.backgroundColor = colors.background;
  widget.setPadding(sizes.padding, sizes.padding, sizes.padding, sizes.padding);

  if (sizes.layout === "columns") {
    // Medium: ring leading, text column trailing, footer pinned to the bottom.
    const row = widget.addStack();
    row.centerAlignContent();

    addRing(row, auslastung, sizes, colors);
    row.addSpacer(sizes.padding);

    const info = row.addStack();
    info.layoutVertically();
    addHeader(info, sizes, colors);
    info.addSpacer(sizes.spacing);
    addCaption(info, auslastung, sizes, colors);
    info.addSpacer();
    addFooter(info, auslastung, sizes, colors);
  } else {
    // Small / large: header and ring centered, footer at the bottom.
    addHeader(widget, sizes, colors);
    widget.addSpacer();

    const ringRow = widget.addStack();
    ringRow.addSpacer();
    addRing(ringRow, auslastung, sizes, colors);
    ringRow.addSpacer();

    if (sizes.showCaption) {
      widget.addSpacer(sizes.spacing);
      const captionRow = widget.addStack();
      captionRow.addSpacer();
      addCaption(captionRow, auslastung, sizes, colors);
      captionRow.addSpacer();
    }

    widget.addSpacer();
    addFooter(widget, auslastung, sizes, colors);
  }

  return widget;
}

async function showPreview(widget, widgetSize) {
  switch (widgetSize) {
    case "small": await widget.presentSmall(); break;
    case "large": await widget.presentLarge(); break;
    default: await widget.presentMedium(); break;
  }
}

// Apple system colors (light, dark) as documented in the HIG.
function getColors() {
  return {
    accent: Color.dynamic(new Color("#32ADE6"), new Color("#64D2FF")), // systemCyan
    label: Color.dynamic(new Color("#000000"), new Color("#FFFFFF")),
    secondaryLabel: Color.dynamic(new Color("#3C3C43", 0.6), new Color("#EBEBF5", 0.6)),
    background: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
    destructive: Color.dynamic(new Color("#FF3B30"), new Color("#FF453A")), // systemRed
    // DrawContext renders a static bitmap, so dynamic colors would be frozen to
    // the appearance at render time. These values read well on both backgrounds.
    ringTrack: new Color("#787880", 0.3), // systemFill
    ringProgress: new Color("#32ADE6"), // systemCyan
    drawnIcon: new Color("#8E8E93"), // systemGray
  };
}

// Margins follow Apple's standard 16pt widget content margin.
function getSizes(widgetSize) {
  if (widgetSize === "small") {
    return {
      layout: "stacked",
      padding: 16,
      spacing: 4,
      iconSize: 16,
      titleFont: Font.title3(),
      captionFont: Font.subheadline(),
      percentFont: Font.boldRoundedSystemFont(24),
      footerFont: Font.caption1(),
      footerIconSize: 11,
      ringDiameter: 76,
      ringWidth: 8,
      showCaption: false,
      showUpdatedLabel: false,
    };
  } else if (widgetSize === "medium") {
    return {
      layout: "columns",
      padding: 16,
      spacing: 2,
      iconSize: 20,
      titleFont: Font.title2(),
      captionFont: Font.body(),
      percentFont: Font.boldRoundedSystemFont(30),
      footerFont: Font.footnote(),
      footerIconSize: 12,
      ringDiameter: 110,
      ringWidth: 12,
      showCaption: true,
      showUpdatedLabel: false,
    };
  } else {
    return {
      layout: "stacked",
      padding: 16,
      spacing: 8,
      iconSize: 24,
      titleFont: Font.title1(),
      captionFont: Font.title3(),
      percentFont: Font.boldRoundedSystemFont(48),
      footerFont: Font.subheadline(),
      footerIconSize: 14,
      ringDiameter: 180,
      ringWidth: 18,
      showCaption: true,
      showUpdatedLabel: true,
    };
  }
}

function addHeader(container, sizes, colors) {
  const header = container.addStack();
  header.centerAlignContent();
  // Stacked layouts center the title; the medium text column stays leading.
  if (sizes.layout === "stacked") header.addSpacer();

  if (showExclamation) {
    const symbol = SFSymbol.named("arrow.up.circle.fill");
    symbol.applyFont(Font.systemFont(sizes.iconSize));
    const badge = header.addImage(symbol.image);
    badge.imageSize = new Size(sizes.iconSize, sizes.iconSize);
    badge.tintColor = colors.accent;
    header.addSpacer(4);
  }

  const title = header.addText("Emser Therme");
  title.font = sizes.titleFont;
  title.textColor = colors.accent;
  title.lineLimit = 1;
  title.minimumScaleFactor = 0.8;
  header.addSpacer();
}

function addRing(container, auslastung, sizes, colors) {
  const hasData = typeof auslastung === "number";

  const ringStack = container.addStack();
  ringStack.size = new Size(sizes.ringDiameter, sizes.ringDiameter);
  ringStack.backgroundImage = drawProgressRing(auslastung, sizes.ringDiameter, sizes.ringWidth, colors.ringTrack, colors.ringProgress);
  ringStack.centerAlignContent();

  const inset = sizes.ringWidth + 4;
  ringStack.setPadding(inset, inset, inset, inset);

  const label = ringStack.addText(hasData ? `${auslastung}%` : "–");
  label.font = sizes.percentFont;
  label.textColor = hasData ? colors.label : colors.secondaryLabel;
  label.centerAlignText();
  label.lineLimit = 1;
  label.minimumScaleFactor = 0.5;
}

function addCaption(container, auslastung, sizes, colors) {
  const hasData = typeof auslastung === "number";
  const caption = container.addText(hasData ? "Therme & Sauna" : "Keine Daten");
  caption.font = sizes.captionFont;
  caption.textColor = hasData ? colors.secondaryLabel : colors.destructive;
  caption.lineLimit = 1;
  caption.minimumScaleFactor = 0.8;
}

// Footer: update time leading, GitHub branding trailing.
function addFooter(container, auslastung, sizes, colors) {
  const footer = container.addStack();
  footer.centerAlignContent();

  // Without a caption (small widget) the footer has to carry the error state.
  if (!sizes.showCaption && typeof auslastung !== "number") {
    addFooterText(footer, "Keine Daten", sizes, colors.destructive);
  } else {
    const clock = SFSymbol.named("clock");
    clock.applyFont(Font.systemFont(sizes.footerIconSize));
    addFooterIcon(footer, clock.image, sizes, colors);

    const df = new DateFormatter();
    df.useShortTimeStyle();
    const time = df.string(new Date());
    addFooterText(footer, sizes.showUpdatedLabel ? `Aktualisiert ${time}` : time, sizes, colors.secondaryLabel);
  }

  footer.addSpacer();

  const brand = footer.addStack();
  brand.centerAlignContent();
  brand.url = `https://github.com/${USER}`;
  addFooterIcon(brand, drawGitHubMark(sizes.footerIconSize * 2, colors.drawnIcon), sizes, colors);
  addFooterText(brand, USER, sizes, colors.secondaryLabel);
}

function addFooterIcon(stack, image, sizes, colors) {
  const icon = stack.addImage(image);
  icon.imageSize = new Size(sizes.footerIconSize, sizes.footerIconSize);
  icon.tintColor = colors.secondaryLabel;
  stack.addSpacer(3);
}

function addFooterText(stack, text, sizes, color) {
  const label = stack.addText(text);
  label.font = sizes.footerFont;
  label.textColor = color;
  label.lineLimit = 1;
  label.minimumScaleFactor = 0.8;
}

function polarPoint(center, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return new Point(center.x + radius * Math.cos(angleRad), center.y + radius * Math.sin(angleRad));
}

function drawProgressRing(percent, diameter, lineWidth, trackColor, progressColor) {
  const ctx = new DrawContext();
  ctx.size = new Size(diameter, diameter);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const center = new Point(diameter / 2, diameter / 2);
  const radius = (diameter - lineWidth) / 2;

  ctx.setLineWidth(lineWidth);
  ctx.setStrokeColor(trackColor);
  ctx.strokeEllipse(new Rect(lineWidth / 2, lineWidth / 2, diameter - lineWidth, diameter - lineWidth));

  if (typeof percent !== "number" || percent <= 0) return ctx.getImage();

  const sweep = (360 * Math.min(percent, 100)) / 100;
  const arc = new Path();
  arc.move(polarPoint(center, radius, 0));
  for (let angle = 1; angle < sweep; angle++) {
    arc.addLine(polarPoint(center, radius, angle));
  }
  arc.addLine(polarPoint(center, radius, sweep));
  ctx.addPath(arc);
  ctx.setStrokeColor(progressColor);
  ctx.strokePath();

  // DrawContext has no round line caps, so draw them as dots on both ends.
  ctx.setFillColor(progressColor);
  for (const angle of [0, sweep]) {
    const p = polarPoint(center, radius, angle);
    ctx.fillEllipse(new Rect(p.x - lineWidth / 2, p.y - lineWidth / 2, lineWidth, lineWidth));
  }

  return ctx.getImage();
}

// GitHub mark from Primer Octicons ("mark-github-24", MIT), 24x24 viewBox.
// Uses only absolute M/C/Z commands, so it maps directly onto Scriptable's Path.
function drawGitHubMark(size, color) {
  const GITHUB_MARK = "M12 1C5.9225 1 1 5.9225 1 12C1 16.8675 4.14875 20.9787 8.52125 22.4362C9.07125 22.5325 9.2775 22.2025 9.2775 21.9137C9.2775 21.6525 9.26375 20.7862 9.26375 19.865C6.5 20.3737 5.785 19.1912 5.565 18.5725C5.44125 18.2562 4.905 17.28 4.4375 17.0187C4.0525 16.8125 3.5025 16.3037 4.42375 16.29C5.29 16.2762 5.90875 17.0875 6.115 17.4175C7.105 19.0812 8.68625 18.6137 9.31875 18.325C9.415 17.61 9.70375 17.1287 10.02 16.8537C7.5725 16.5787 5.015 15.63 5.015 11.4225C5.015 10.2262 5.44125 9.23625 6.1425 8.46625C6.0325 8.19125 5.6475 7.06375 6.2525 5.55125C6.2525 5.55125 7.17375 5.2625 9.2775 6.67875C10.1575 6.43125 11.0925 6.3075 12.0275 6.3075C12.9625 6.3075 13.8975 6.43125 14.7775 6.67875C16.8813 5.24875 17.8025 5.55125 17.8025 5.55125C18.4075 7.06375 18.0225 8.19125 17.9125 8.46625C18.6138 9.23625 19.04 10.2125 19.04 11.4225C19.04 15.6437 16.4688 16.5787 14.0213 16.8537C14.42 17.1975 14.7638 17.8575 14.7638 18.8887C14.7638 20.36 14.75 21.5425 14.75 21.9137C14.75 22.2025 14.9563 22.5462 15.5063 22.4362C19.8513 20.9787 23 16.8537 23 12C23 5.9225 18.0775 1 12 1Z";

  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const scale = size / 24;
  const tokens = GITHUB_MARK.match(/[MCZ]|\d*\.?\d+/g);
  const pt = (i) => new Point(Number(tokens[i]) * scale, Number(tokens[i + 1]) * scale);

  const path = new Path();
  let i = 0;
  let cmd = null;
  while (i < tokens.length) {
    if (/[MCZ]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === "M") {
      path.move(pt(i));
      i += 2;
    } else if (cmd === "C") {
      path.addCurve(pt(i + 4), pt(i), pt(i + 2));
      i += 6;
    } else {
      path.closeSubpath();
    }
  }

  ctx.addPath(path);
  ctx.setFillColor(color);
  ctx.fillPath();
  return ctx.getImage();
}
