const URL = "https://www.emser-therme.de/";
const widgetSize = config.widgetFamily || "large";
const VERSION = "1.1.0";
const USER = "TimR153";
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
    const row = widget.addStack();
    row.centerAlignContent();

    addRing(row, auslastung, sizes, colors);
    row.addSpacer(sizes.padding);

    const info = row.addStack();
    info.layoutVertically();
    info.addSpacer();
    addHeader(info, sizes, colors);
    info.addSpacer(sizes.spacing);
    addCaption(info, auslastung, sizes, colors, "left");
    if (sizes.showFooter) {
      info.addSpacer(sizes.spacing);
      addFooter(info, sizes, colors, "left");
    }
    info.addSpacer();
  } else {
    widget.addSpacer();

    const headerRow = widget.addStack();
    headerRow.addSpacer();
    addHeader(headerRow, sizes, colors);
    headerRow.addSpacer();
    widget.addSpacer(sizes.spacing);

    const ringRow = widget.addStack();
    ringRow.addSpacer();
    addRing(ringRow, auslastung, sizes, colors);
    ringRow.addSpacer();
    widget.addSpacer(sizes.spacing);

    addCaption(widget, auslastung, sizes, colors, "center");
    widget.addSpacer();

    if (sizes.showFooter) addFooter(widget, sizes, colors, "center");
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

function getColors() {
  return {
    accent: Color.dynamic(new Color("#0A84C7"), new Color("#2FB9EB")),
    label: Color.dynamic(new Color("#000000"), new Color("#FFFFFF")),
    secondaryLabel: Color.dynamic(new Color("#3C3C43", 0.6), new Color("#EBEBF5", 0.6)),
    tertiaryLabel: Color.dynamic(new Color("#3C3C43", 0.3), new Color("#EBEBF5", 0.3)),
    background: Color.dynamic(new Color("#FFFFFF"), new Color("#1C1C1E")),
    track: Color.dynamic(new Color("#787880", 0.2), new Color("#787880", 0.36)),
    destructive: Color.dynamic(new Color("#FF3B30"), new Color("#FF453A")),
  };
}

function getSizes(widgetSize) {
  if (widgetSize === "small") {
    return {
      layout: "stacked",
      padding: 12,
      spacing: 4,
      iconSize: 12,
      titleFont: Font.caption1(),
      captionFont: Font.caption2(),
      percentFont: Font.title2(),
      footerFont: Font.caption2(),
      ringDiameter: 80,
      ringWidth: 10,
      showFooter: false,
    };
  } else if (widgetSize === "medium") {
    return {
      layout: "columns",
      padding: 16,
      spacing: 6,
      iconSize: 14,
      titleFont: Font.headline(),
      captionFont: Font.subheadline(),
      percentFont: Font.title1(),
      footerFont: Font.caption2(),
      ringDiameter: 92,
      ringWidth: 12,
      showFooter: true,
    };
  } else {
    return {
      layout: "stacked",
      padding: 18,
      spacing: 8,
      iconSize: 16,
      titleFont: Font.title2(),
      captionFont: Font.headline(),
      percentFont: Font.largeTitle(),
      footerFont: Font.caption1(),
      ringDiameter: 140,
      ringWidth: 16,
      showFooter: true,
    };
  }
}

function addHeader(container, sizes, colors) {
  const header = container.addStack();
  header.centerAlignContent();

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
}

function addRing(container, auslastung, sizes, colors) {
  const ringImage = drawProgressRing(auslastung, sizes.ringDiameter, sizes.ringWidth, colors.track, colors.accent);

  const ringStack = container.addStack();
  ringStack.size = new Size(sizes.ringDiameter, sizes.ringDiameter);
  ringStack.backgroundImage = ringImage;
  ringStack.cornerRadius = sizes.ringDiameter / 2;
  ringStack.layoutVertically();

  const hasData = typeof auslastung === "number";

  ringStack.addSpacer();
  const labelRow = ringStack.addStack();
  labelRow.addSpacer();
  const label = labelRow.addText(hasData ? `${auslastung}%` : "–");
  label.font = sizes.percentFont;
  label.textColor = hasData ? colors.label : colors.destructive;
  label.centerAlignText();
  label.lineLimit = 1;
  label.minimumScaleFactor = 0.6;
  labelRow.addSpacer();
  ringStack.addSpacer();
}

function addCaption(container, auslastung, sizes, colors, align) {
  const hasData = typeof auslastung === "number";
  const caption = container.addText(hasData ? "Therme & Sauna" : "Keine Daten");
  caption.font = sizes.captionFont;
  caption.textColor = hasData ? colors.secondaryLabel : colors.destructive;
  caption.lineLimit = 1;
  caption.minimumScaleFactor = 0.8;
  if (align === "center") caption.centerAlignText(); else caption.leftAlignText();
}

function addFooter(container, sizes, colors, align) {
  const df = new DateFormatter();
  df.useMediumTimeStyle();
  const footer = container.addText("Letztes Update: " + df.string(new Date()));
  footer.font = sizes.footerFont;
  footer.textColor = colors.tertiaryLabel;
  footer.lineLimit = 1;
  footer.minimumScaleFactor = 0.7;
  if (align === "center") footer.centerAlignText(); else footer.leftAlignText();
}

function polarPoint(center, radius, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return new Point(center.x + radius * Math.cos(angleRad), center.y + radius * Math.sin(angleRad));
}

function buildRingSegmentPath(center, outerRadius, innerRadius, startAngle, endAngle) {
  const steps = Math.max(2, Math.ceil((endAngle - startAngle) / 2));
  const path = new Path();

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    const point = polarPoint(center, outerRadius, angle);
    if (i === 0) path.move(point); else path.addLine(point);
  }
  for (let i = steps; i >= 0; i--) {
    const angle = startAngle + ((endAngle - startAngle) * i) / steps;
    path.addLine(polarPoint(center, innerRadius, angle));
  }
  path.closeSubpath();
  return path;
}

function drawProgressRing(percent, diameter, ringWidth, trackColor, progressColor) {
  const ctx = new DrawContext();
  ctx.size = new Size(diameter, diameter);
  ctx.opaque = false;
  ctx.respectScreenScale = true;

  const center = new Point(diameter / 2, diameter / 2);
  const outerRadius = diameter / 2;
  const innerRadius = outerRadius - ringWidth;

  ctx.addPath(buildRingSegmentPath(center, outerRadius, innerRadius, 0, 359.99));
  ctx.setFillColor(trackColor);
  ctx.fillPath();

  const clamped = typeof percent === "number" ? Math.max(0, Math.min(100, percent)) : 0;
  if (clamped > 0) {
    const sweep = Math.max(360 * (clamped / 100), 0.5);

    ctx.addPath(buildRingSegmentPath(center, outerRadius, innerRadius, 0, sweep));
    ctx.setFillColor(progressColor);
    ctx.fillPath();

    const capRadius = ringWidth / 2;
    const capTrackRadius = (outerRadius + innerRadius) / 2;
    ctx.setFillColor(progressColor);
    const startCap = polarPoint(center, capTrackRadius, 0);
    ctx.fillEllipse(new Rect(startCap.x - capRadius, startCap.y - capRadius, capRadius * 2, capRadius * 2));
    if (clamped < 100) {
      const endCap = polarPoint(center, capTrackRadius, sweep);
      ctx.fillEllipse(new Rect(endCap.x - capRadius, endCap.y - capRadius, capRadius * 2, capRadius * 2));
    }
  }

  return ctx.getImage();
}
