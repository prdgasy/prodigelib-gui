import { playsound, rel } from "sandstone";
import { Button } from "../../button";
import { PageClass } from "../../page";
import type { Gui } from "../../gui";
import { GuiObject } from "../../types";


type SoundEvent = Parameters<typeof playsound>[0];

export interface NavigationButtonsOptions {
  nextButton: Button;
  nextButtonEnd?: Button;
  previousButton: Button;
  previousButtonEnd?: Button;
}

export type NavigationButtons = Required<NavigationButtonsOptions>;

export class PaginatedPage {
  parent: Gui;
  name: string;

  staticObjects: GuiObject[];
  buttons: Button[];
  buttonsSlots: number[];

  navigationButtons: NavigationButtons;
  navigationButtonsSound?: SoundEvent;

  static PaginatedId = 0;
  id: number;

  constructor(
    parent: Gui,
    name?: string,
    staticObjects?: GuiObject[],
    buttons?: Button[],
    slots?: number[],

    navigationButtons?: NavigationButtonsOptions,

    navigationButtonsSound?: SoundEvent,
  ) {
    this.id = PaginatedPage.PaginatedId++;

    this.parent = parent;
    this.name = name ?? `PaginatedPage_${this.id}`;

    this.staticObjects = staticObjects ?? [];
    this.buttons = buttons ?? [];
    this.buttonsSlots = slots ?? [...Array(18).keys()];

    const nextButton =
      navigationButtons?.nextButton ??
      new Button({
        slot: 26,
        id: "paper",
        name: "§eNext",
      });

    const previousButton =
      navigationButtons?.previousButton ??
      new Button({
        slot: 25,
        id: "paper",
        name: "§ePrevious",
      });

    this.navigationButtons = {
      nextButton,
      nextButtonEnd: navigationButtons?.nextButtonEnd ?? nextButton,
      previousButton,
      previousButtonEnd:
        navigationButtons?.previousButtonEnd ?? previousButton,
    };

    this.navigationButtonsSound = navigationButtonsSound;
  }

  private getButtonsList(totalPageNumber: number): Button[][] {
    const buttonsList: Button[][] = [];

    for (let pageIndex = 0; pageIndex < totalPageNumber; pageIndex++) {
      const currentButtons: Button[] = [];

      currentButtons.push(
        ...this.resolveNavigationButtons(pageIndex, totalPageNumber),
      );

      const start = pageIndex * this.buttonsSlots.length;
      const stop = Math.min(
        this.buttons.length,
        start + this.buttonsSlots.length,
      );

      for (let i = start; i < stop; i++) {
        const slot = this.buttonsSlots[i - start];

        if (this.buttons[i].slot !== undefined) throw Error(
          `Slot parameter is unnecessary for button "${this.buttons[i].name}" ` +
          `(index ${i}) in paginated page "${this.name}". ` +
          `The slot is automatically assigned from buttonsSlots. `);
        this.buttons[i].slot = slot;
        currentButtons.push(this.buttons[i]);
      }

      buttonsList.push(currentButtons);
    }

    return buttonsList;
  }

  resolveNavigationButtons(
    pageIndex: number,
    totalPageNumber: number,
  ): Button[] {
    const navigationButtons: Button[] = [];

    const sound = () => {
      if (this.navigationButtonsSound) {
        playsound(
          this.navigationButtonsSound,
          "master",
          "@p",
          rel(0, 0, 0),
          1,
          0,
        );
      }
    };

    const cloneButton = (button: Button): Button =>
      Object.assign(
        Object.create(Object.getPrototypeOf(button)),
        button,
      );

    /*
     * Clone the buttons so that changing the onClick callback
     * for one generated page does not modify the original button.
     */
    const navigationButtonsClone: NavigationButtons = {
      nextButton: cloneButton(this.navigationButtons.nextButton),
      nextButtonEnd: cloneButton(this.navigationButtons.nextButtonEnd),
      previousButton: cloneButton(
        this.navigationButtons.previousButton,
      ),
      previousButtonEnd: cloneButton(
        this.navigationButtons.previousButtonEnd,
      ),
    };

    // NEXT
    navigationButtonsClone.nextButton.onClick = () => {
      sound();
      this.parent.switch(this.getName(pageIndex + 1));
    };

    const isLastPage =
      pageIndex === totalPageNumber - 1;

    if (isLastPage) {
      navigationButtons.push(
        navigationButtonsClone.nextButtonEnd,
      );
    } else {
      navigationButtons.push(
        navigationButtonsClone.nextButton,
      );
    }

    // PREVIOUS
    navigationButtonsClone.previousButton.onClick = () => {
      sound();
      this.parent.switch(this.getName(pageIndex - 1));
    };

    const isFirstPage = pageIndex === 0;

    if (isFirstPage) {
      navigationButtons.push(
        navigationButtonsClone.previousButtonEnd,
      );
    } else {
      navigationButtons.push(
        navigationButtonsClone.previousButton,
      );
    }

    return navigationButtons;
  }

  private getName(pageIndex: number): string {
    return (
      pageIndex === 0
        ? this.name
        : `${this.name}_${pageIndex}`
    );
  }

  private buildLocalPage(
    localObjects: Button[],
    pageIndex: number,
  ) {
    return this.parent.registerPage(this.getName(pageIndex), [...this.staticObjects, ...localObjects]);
  }

  build() {
    const totalPageNumber = Math.max(
      1,
      Math.ceil(
        this.buttons.length /
        this.buttonsSlots.length,
      ),
    );

    const objectsList =
      this.getButtonsList(totalPageNumber);

    for (
      let pageIndex = 0;
      pageIndex < totalPageNumber;
      pageIndex++
    ) {
      this.buildLocalPage(
        objectsList[pageIndex],
        pageIndex,
      );
    }

    return this;
  }
}
