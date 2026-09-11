import {
  colorTokensToCssVars,
  normalizeColorTokensForMode,
  serializeCssVars,
} from "@/features/theme/css-vars";
import { typographyCssVars } from "@/features/theme/typography-css";
import {
  motionDesignTokens,
  motionHtmlDataAttributes,
  resolveMotionConfig,
} from "@/features/motion-3d";
import type { PlatformConfig } from "@/types";

const STORAGE_KEY = "platform-theme-mode";

/**
 * Blocking boot script: applies stored/system theme before first paint
 * so dark-mode users don't flash the light (white) background.
 */
export function buildThemeBootScript(config: PlatformConfig): string {
  const light = serializeCssVars(
    colorTokensToCssVars(normalizeColorTokensForMode(config.theme.light, "light")),
  );
  const dark = serializeCssVars(
    colorTokensToCssVars(normalizeColorTokensForMode(config.theme.dark, "dark")),
  );
  const fonts = serializeCssVars(typographyCssVars(config.typography));
  const motionEffective = resolveMotionConfig({
    global: config.animation,
    reducedMotion: false,
  });
  const motion = serializeCssVars(motionDesignTokens(motionEffective));
  const motionAttrs = motionHtmlDataAttributes(motionEffective);
  const defaultMode = config.theme.defaultMode === "dark" ? "dark" : "light";
  const enabled = JSON.stringify(config.theme.enabledModes);
  const attrPairs = JSON.stringify(motionAttrs);

  // Keep this string ES5-safe and free of template nesting issues.
  return `(()=>{try{var k=${JSON.stringify(STORAGE_KEY)};var s=null;try{s=localStorage.getItem(k)}catch(e){}var enabled=${enabled};var def=${JSON.stringify(defaultMode)};var mode=s||def;if(enabled.indexOf(mode)<0)mode=def;var resolved=mode;if(mode==="system"){resolved=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(enabled.indexOf(resolved)<0)resolved=enabled.indexOf("dark")>=0&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":enabled.indexOf("light")>=0?"light":def}if(resolved!=="dark"&&resolved!=="light")resolved=def;var css=resolved==="dark"?${JSON.stringify(dark)}:${JSON.stringify(light)};var fonts=${JSON.stringify(fonts)};var motion=${JSON.stringify(motion)};var attrs=${attrPairs};var r=document.documentElement;r.classList.toggle("dark",resolved==="dark");r.style.colorScheme=resolved;css.split(";").forEach(function(p){var i=p.indexOf(":");if(i>0)r.style.setProperty(p.slice(0,i),p.slice(i+1))});fonts.split(";").forEach(function(p){var i=p.indexOf(":");if(i>0)r.style.setProperty(p.slice(0,i),p.slice(i+1))});motion.split(";").forEach(function(p){var i=p.indexOf(":");if(i>0)r.style.setProperty(p.slice(0,i),p.slice(i+1))});Object.keys(attrs).forEach(function(key){r.setAttribute(key,attrs[key])});if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){r.setAttribute("data-store-motion","off");r.setAttribute("data-card-motion","clean");r.setAttribute("data-image-motion","none");r.setAttribute("data-button-hover","none")}}catch(e){}})();`;
}
