import { MCFunction, tellraw } from "sandstone";

type uninstallOptions = {
  name: string;
  type: 'lib' | 'pack';
  callback: () => void;
}

export class Uninstall {
  private static packs: uninstallOptions[] = [];

  public static register(name: string, type: 'lib' | 'pack', callback: () => void) {
    this.packs.push({
      name,
      type,
      callback: callback
    });
  }

  public static generate() {
    return MCFunction('uninstall', () => {
      this.packs.forEach(pack => {
        pack.callback();
        this.msg(pack.name, pack.type);
      });
    })
  }

  private static msg(name: string, type: 'lib' | 'pack') {
    if (type == 'pack') return tellraw('@s', `§a✓ §e${name} Pack §7has been uninstalled §asuccessfully§7.`);
    return tellraw("@s", `§a✓ §d${name} Lib §7has been uninstalled §asuccessfully§7.`);
  }
}

