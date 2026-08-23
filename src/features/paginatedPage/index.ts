import { Objective, Score } from "sandstone";
import { MenuObject } from "../../types";
import { Page } from "../../page";
import { GUI } from "../../gui";
import { PaginatedButtonClass } from "./button";
import { Button } from "../../..";

export class PaginatedPageClass {
  parent: GUI;
  name: string;
  staticObjects: MenuObject[];
  objects: PaginatedButtonClass[];
  objectsLength: number;
  objectsSlots: number[];
  nextPageSlot: number;
  previousPageSlot: number;

  static PaginatedId = 0;
  id: number;

  constructor(parent: GUI, name?: string, staticObjectList?: MenuObject[], objectList?: PaginatedButtonClass[], objectSlots?: number[], nextPageSlot?: number, previousPageSlot?: number) {
    this.id = PaginatedPageClass.PaginatedId++;
    this.parent = parent;
    this.name = name ?? `PaginatedPage_${this.id}`;
    this.staticObjects = staticObjectList ?? [];
    this.objects = objectList ?? [];
    this.objectsLength = objectList ? objectList.length : 0;
    this.objectsSlots = objectSlots ?? [...Array(18).keys()];
    this.nextPageSlot = nextPageSlot ?? 25;
    this.previousPageSlot = previousPageSlot ?? 26;
  }

  private getObjectsList(totalPageNumber: number): MenuObject[][] {

    const objectsList: MenuObject[][] = [];
    for (let h = 0; h < totalPageNumber; h++) {
      const currentObjects: MenuObject[] = [];
      const newStart = h * this.objectsSlots.length;
      for (let i = newStart; i < this.objectsLength; i++) {
        const slot = this.objectsSlots[i - newStart];
        currentObjects.push(this.objects[i].toButton(slot));
      }
      objectsList.push(currentObjects);
    }

    return objectsList;
  }

  buildPage(localObjects: MenuObject[], pageNumber: number, totalPageNumber: number) {
    const newPage = Page(this.parent, `${this.name}_${pageNumber}`, [...this.staticObjects, ...localObjects]);

    // next button
    const isLastPage: boolean = (pageNumber == totalPageNumber - 1)

    const nextOnClick = isLastPage ? () => { } : () => this.parent.toPage(`${this.name}_${pageNumber + 1}`);
    const nextColor = isLastPage ? 'gray' : 'yellow';

    newPage.pushObject(Button({
      slot: this.nextPageSlot,
      id: 'paper',
      name: { text: 'Next', color: nextColor },
      onClick: nextOnClick,
    }));

    // previous button
    const isFirstPage = pageNumber == 0
    const previousOnClick = isFirstPage ? () => { } : () => this.parent.toPage(`${this.name}_${pageNumber - 1}`);
    const previousColor = isFirstPage ? 'gray' : 'yellow';


    newPage.pushObject(Button({
      slot: this.previousPageSlot,
      id: 'paper',
      name: { text: 'Previous', color: previousColor },
      onClick: previousOnClick,
    }));

    newPage.build();
  }

  build() {
    const totalPageNumber = Math.ceil(this.objectsLength / this.objectsSlots.length);

    const objectsList: MenuObject[][] = this.getObjectsList(totalPageNumber);

    for (let i = 0; i < totalPageNumber; i++) {
      this.buildPage(objectsList[i], i, totalPageNumber);
    }
  }
}

export function PaginatedPage({ parent, name, staticObjectList, objectList, objectSlots, nextPageSlot, previousPageSlot }: {
  parent: GUI;
  name?: string;
  staticObjectList?: MenuObject[];
  objectList?: PaginatedButtonClass[];
  objectSlots?: number[];
  nextPageSlot?: number;
  previousPageSlot?: number;
}): PaginatedPageClass {
  return new PaginatedPageClass(parent, name!, staticObjectList!, objectList!, objectSlots!, nextPageSlot!, previousPageSlot!);
}