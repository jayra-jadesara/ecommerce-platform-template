import {
  colorTokensToCssVars,
  serializeCssVars,
} from "@/features/theme/css-vars";
import type { PlatformConfig } from "@/types";

const STORAGE_KEY = "platform-theme-mode";

/**
 * Blocking boot script: applies stored/system theme before first paint
 * so dark-mode users don't flash the light (white) background.
 */
export function buildThemeBootScript(config: PlatformConfig): string {
  const light = serializeCssVars(colorTokensToCssVars(config.theme.light));
  const dark = serializeCssVars(colorTokensToCssVars(config.theme.dark));
  const defaultMode = config.theme.defaultMode === "dark" ? "dark" : "light";
  const enabled = JSON.stringify(config.theme.enabledModes);

  // Keep this string ES5-safe and free of template nesting issues.
  return `(()=>{try{var k=${JSON.stringify(STORAGE_KEY)};var s=null;try{s=localStorage.getItem(k)}catch(e){}var enabled=${enabled};var def=${JSON.stringify(defaultMode)};var mode=s||def;if(enabled.indexOf(mode)<0)mode=def;var resolved=mode;if(mode==="system"){resolved=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(enabled.indexOf(resolved)<0)resolved=enabled.indexOf("dark")>=0&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":enabled.indexOf("light")>=0?"light":def}if(resolved!=="dark"&&resolved!=="light")resolved=def;var css=resolved==="dark"?${JSON.stringify(dark)}:${JSON.stringify(light)};var r=document.documentElement;r.classList.toggle("dark",resolved==="dark");r.style.colorScheme=resolved;css.split(";").forEach(function(p){var i=p.indexOf(":");if(i>0)r.style.setProperty(p.slice(0,i),p.slice(i+1))})}catch(e){}})();`;
}
