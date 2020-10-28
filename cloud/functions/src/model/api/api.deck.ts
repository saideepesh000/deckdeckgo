import {ApiSlide} from './api.slide';

export interface ApiDeckAttributes {
  style?: string;
  animation?: string;
  direction?: string;
  directionMobile?: string;
  autoSlide?: string;
}

export interface ApiDeck {
  id?: string;
  slides: ApiSlide[];
  name: string;
  description: string;
  owner_id: string;
  attributes?: ApiDeckAttributes;
  background?: string;
  header?: string;
  footer?: string;
  head_extra?: string;
}
