import { Objective, playsound, rel, Score } from "sandstone";
import { ButtonClass } from "../../button";
import { Page } from "../../page";
import { GUI } from "../../gui";
import { PaginatedButtonClass } from "./button";
import { Button } from "../../..";

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

  buildPage(localObjects: ButtonClass[], pageNumber: number, totalPageNumber: number) {
    const newPage = Page(this.parent, `${this.name}_${pageNumber}`, [...this.staticObjects, ...localObjects]);

    // next button

    this.navigationButtons.nextButton.onClick = () => {
      if (this.navigationButtonsSound) {
        playsound(this.navigationButtonsSound, 'master', '@p', rel(0, 0, 0), 1, 0);
      }
      this.parent.toPage(`${this.name}_${pageNumber + 1}`);
    }

    const isLastPage: boolean = (pageNumber == totalPageNumber - 1)

    if (isLastPage) newPage.pushObject(this.navigationButtons.nextButtonEnd);
    else newPage.pushObject(this.navigationButtons.nextButton);



    // previous button

    this.navigationButtons.previousButton.onClick = () => this.parent.toPage(`${this.name}_${pageNumber - 1}`);

    const isFirstPage: boolean = pageNumber == 0;
    if (isFirstPage) newPage.pushObject(this.navigationButtons.previousButtonEnd);
    else newPage.pushObject(this.navigationButtons.previousButton);

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