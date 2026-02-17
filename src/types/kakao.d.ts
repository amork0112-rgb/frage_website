// src/types/kakao.d.ts
declare global {
  interface Window {
    kakao: typeof kakao;
    daum: any;
  }
}

declare namespace kakao {
  namespace maps {
    class LatLng {
      constructor(latitude: number, longitude: number);
      getLat(): number;
      getLng(): number;
    }

    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      setLevel(level: number): void;
      getLevel(): number;
      setDraggable(draggable: boolean): void;
      getBounds(): LatLngBounds;
    }

    interface MapOptions {
      center: LatLng;
      level: number;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latlng: LatLng): void;
      getPosition(): LatLng;
      setDraggable(draggable: boolean): void;
    }

    interface MarkerOptions {
      map: Map;
      position: LatLng;
      draggable?: boolean;
    }

    class LatLngBounds {
      extend(latlng: LatLng): void;
    }

    namespace event {
      function addListener(target: any, eventType: string, handler: Function): void;
    }

    namespace services {
      class Places {
        keywordSearch(
          keyword: string,
          callback: (
            data: PlaceResult[],
            status: Status,
            pagination: Pagination
          ) => void,
          options?: PlacesOptions
        ): void;
      }

      interface PlaceResult {
        address_name: string;
        category_group_code: string;
        category_group_name: string;
        category_name: string;
        distance: string;
        id: string;
        phone: string;
        place_name: string;
        place_url: string;
        road_address_name: string;
        x: string; // longitude
        y: string; // latitude
      }

      const enum Status {
        OK = "OK",
        ZERO_RESULT = "ZERO_RESULT",
        ERROR = "ERROR",
      }

      interface Pagination {
        nextPage(): void;
        prevPage(): void;
        gotoPage(page: number): void;
        totalCount: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      }

      interface PlacesOptions {
        size?: number;
        page?: number;
        category_group_code?: string;
        x?: number; // longitude
        y?: number; // latitude
        radius?: number;
        sort?: "accuracy" | "distance";
      }
    }
  }
}
