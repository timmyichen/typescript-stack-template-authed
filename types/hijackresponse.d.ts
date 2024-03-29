declare module 'hijackresponse' {
  import express from 'express';

  interface IHijackedResponse extends express.Response {
    unhijack: () => void;
  }

  type HijackResponseCallback = (err: Error, res: IHijackedResponse) => void;

  export = (originalRes: express.Response, cb: HijackResponseCallback) => null;
}
