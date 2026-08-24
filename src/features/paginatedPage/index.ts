import { Objective, playsound, rel, Score } from "sandstone";
import { Button, ButtonClass } from "../../button";
import { Page } from "../../page";
import { GUI } from "../../gui";
import { PaginatedButtonClass } from "./button";
export * from "./button";

type SoundEvent = Parameters<typeof playsound>[0];

interface NavigationButtonsOptions {
  nextButton: ButtonClass;
  nextButtonEnd?: ButtonClass;
  previousButton: ButtonClass;
  previousButtonEnd?: ButtonClass;
}

export type NavigationButtons = Required<NavigationButtonsOptions>;

export class PaginatedPageClass {
  parent: GUI;
  name: string;
  staticObjects: ButtonClass[];
  objects: PaginatedButtonClass[];
  objectsLength: number;
  objectsSlots: number[];

  navigationButtons: NavigationButtons;

  navigationButtonsSound?: SoundEvent;

  static PaginatedId = 0;
  id: number;

  constructor(parent: GUI, name?: string, staticObjectList?: ButtonClass[], objectList?: PaginatedButtonClass[], objectSlots?: number[], navigationButtons?: NavigationButtonsOptions, navigationButtonsSound?: SoundEvent) {
    this.id = PaginatedPageClass.PaginatedId++;
    this.parent = parent;
    this.name = name ?? `PaginatedPage_${this.id}`;
    this.staticObjects = staticObjectList ?? [];
    this.objects = objectList ?? [];
    this.objectsLength = objectList ? objectList.length : 0;
    this.objectsSlots = objectSlots ?? [...Array(18).keys()];

    const nextButton = navigationButtons?.nextButton ?? Button({
      slot: 26,
      id: 'paper',
      name: { text: 'Next', color: 'yellow' },
    });

    const previousButton = navigationButtons?.previousButton ?? Button({
      slot: 25,
      id: 'paper',
      name: { text: 'Previous', color: 'yellow' },
    });

    this.navigationButtons = {
      nextButton,
      nextButtonEnd: navigationButtons?.nextButtonEnd ?? nextButton,
      previousButton,
      previousButtonEnd: navigationButtons?.previousButtonEnd ?? previousButton,
    };


    this.navigationButtonsSound = navigationButtonsSound ?? undefined;

  }

  private getObjectsList(totalPageNumber: number): ButtonClass[][] {

    const objectsList: ButtonClass[][] = [];
    for (let h = 0; h < totalPageNumber; h++) {
      const currentObjects: ButtonClass[] = [];

      currentObjects.push(...this.resolveNavigationButtons(h, totalPageNumber));

      const start = h * this.objectsSlots.length;
      const stop = Math.min(this.objectsLength, start + this.objectsSlots.length);
      for (let i = start; i < stop; i++) {
        const slot = this.objectsSlots[i - start];
        currentObjects.push(this.objects[i].toButton(slot));
      }
      objectsList.push(currentObjects);
    }

    return objectsList;
  }

  resolveNavigationButtons(pageIndex: number, totalPageNumber: number): ButtonClass[] {
    const navigationButtons: ButtonClass[] = [];
    const sound = () => { if (this.navigationButtonsSound) playsound(this.navigationButtonsSound, 'master', '@p', rel(0, 0, 0), 1, 0); }

    const cloneButton = (btn: ButtonClass): ButtonClass =>
      Object.assign(Object.create(Object.getPrototypeOf(btn)), btn);
    const navigationButtonsClone: NavigationButtons = {
      nextButton: cloneButton(this.navigationButtons.nextButton),
      nextButtonEnd: cloneButton(this.navigationButtons.nextButtonEnd),
      previousButton: cloneButton(this.navigationButtons.previousButton),
      previousButtonEnd: cloneButton(this.navigationButtons.previousButtonEnd),
    };
    //  using clone to prevent index object smashing
    navigationButtonsClone.nextButton.onClick = () => {
      sound();
      this.parent.toPage(`${this.name}_${pageIndex + 1}`);
    }

    const isLastPage: boolean = (pageIndex == totalPageNumber - 1)
    if (isLastPage) navigationButtons.push(navigationButtonsClone.nextButtonEnd);
    else navigationButtons.push(navigationButtonsClone.nextButton);



    navigationButtonsClone.previousButton.onClick = () => {
      sound();
      if (pageIndex == 1) this.parent.toPage(`${this.name}`);
      else this.parent.toPage(`${this.name}_${pageIndex - 1}`);
    }
    const isFirstPage: boolean = pageIndex == 0;
    if (isFirstPage) navigationButtons.push(navigationButtonsClone.previousButtonEnd);
    else navigationButtons.push(navigationButtonsClone.previousButton);

    return navigationButtons;
  }

  buildPage(localObjects: ButtonClass[], pageIndex: number, totalPageNumber: number) {
    const name = (pageIndex == 0) ? `${this.name}` : `${this.name}_${pageIndex}`;
    const newPage = Page(this.parent, name, [...this.staticObjects, ...localObjects]);

    newPage.build();
  }

  build() {
    const totalPageNumber = Math.ceil(this.objectsLength / this.objectsSlots.length);

    const objectsList: ButtonClass[][] = this.getObjectsList(totalPageNumber);

    for (let i = 0; i < totalPageNumber; i++) {
      this.buildPage(objectsList[i], i, totalPageNumber);
    }
  }
}

export function PaginatedPage({ parent, name, staticObjectList, objectList, objectSlots, navigationButtons, navigationButtonsSound }: {
  parent: GUI;
  name?: string;
  staticObjectList?: ButtonClass[];
  objectList?: PaginatedButtonClass[];
  objectSlots?: number[];
  navigationButtons?: NavigationButtonsOptions;
  navigationButtonsSound?: SoundEvent;
}): PaginatedPageClass {
  return new PaginatedPageClass(parent, name, staticObjectList, objectList, objectSlots, navigationButtons, navigationButtonsSound);
}