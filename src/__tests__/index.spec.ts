import { of, throwError, interval, Subject } from "rxjs";
import {
  eachValueFrom,
  bufferedValuesFrom,
  latestValueFrom,
  nextValueFrom,
} from "..";
import { take, finalize } from "rxjs/operators";

describe("eachValueFrom", () => {
  test("should work for sync observables", async () => {
    const source = of(1, 2, 3);
    const results: number[] = [];
    for await (const value of eachValueFrom(source)) {
      results.push(value);
    }
    expect(results).toEqual([1, 2, 3]);
  });

  test("should throw if the observable errors", async () => {
    const source = throwError(new Error("bad"));
    let error: any;
    try {
      for await (const _ of eachValueFrom(source)) {
        // do nothing
      }
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("bad");
  });

  test("should support async observables", async () => {
    const source = interval(1).pipe(take(3));
    const results: number[] = [];
    for await (const value of eachValueFrom(source)) {
      results.push(value);
    }
    expect(results).toEqual([0, 1, 2]);
  });

  test("should do something clever if the loop exits", async () => {
    let finalized = false;
    const source = interval(1).pipe(
      take(10),
      finalize(() => (finalized = true))
    );
    const results: number[] = [];
    try {
      for await (const value of eachValueFrom(source)) {
        results.push(value);
        if (value === 1) {
          throw new Error("bad");
        }
      }
    } catch (err) {
      // ignore
    }
    expect(results).toEqual([0, 1]);
    expect(finalized).toBe(true);
  });

  test("a more advanced test", async () => {
    const results: number[] = [];
    const source = new Subject<number>();
    const advancer = createAdvancer();

    async function executeTest() {
      for await (const value of eachValueFrom(source)) {
        results.push(value);
        await advancer;
      }
    }

    const complete = executeTest();

    source.next(0);
    source.next(1);
    source.next(2);
    await advancer.next();
    // A loop was waiting by the time 0 was sent, so it
    // will resolve, then the advancer causes it to loop
    // again.
    expect(results).toEqual([0, 1]);
    await advancer.next();
    expect(results).toEqual([0, 1, 2]);

    // Nothing arrived, start the loop waiting again.
    await advancer.next();
    expect(results).toEqual([0, 1, 2]);

    source.next(3);
    source.next(4);
    source.next(5);
    await advancer.next();
    // We were waiting for 3 already, so that was resolved,
    // then the advancer caused the loop back around to
    // get 4
    expect(results).toEqual([0, 1, 2, 3, 4]);

    await advancer.next();
    expect(results).toEqual([0, 1, 2, 3, 4, 5]);

    // end the loop
    source.complete();

    await complete;
    expect(results).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("bufferedValuesFrom", () => {
  test("should work for sync observables", async () => {
    const source = of(1, 2, 3);
    const results: number[][] = [];
    for await (const value of bufferedValuesFrom(source)) {
      results.push(value);
    }
    expect(results).toEqual([[1, 2, 3]]);
  });

  test("should throw if the observable errors", async () => {
    const source = throwError(new Error("bad"));
    let error: any;
    try {
      for await (const _ of bufferedValuesFrom(source)) {
        // do nothing
      }
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("bad");
  });

  test("should support async observables", async () => {
    const source = interval(1).pipe(take(3));
    const results: number[][] = [];
    for await (const value of bufferedValuesFrom(source)) {
      results.push(value);
    }
    expect(results).toEqual([[0], [1], [2]]);
  });

  test("should do something clever if the loop exits", async () => {
    let finalized = false;
    const source = interval(1).pipe(
      take(10),
      finalize(() => (finalized = true))
    );
    const results: number[][] = [];
    try {
      for await (const value of bufferedValuesFrom(source)) {
        results.push(value);
        if (value[0] === 1) {
          throw new Error("bad");
        }
      }
    } catch (err) {
      // ignore
    }
    expect(results).toEqual([[0], [1]]);
    expect(finalized).toBe(true);
  });

  test("a more in-depth test", async () => {
    const results: number[][] = [];
    const source = new Subject<number>();
    const advancer = createAdvancer();

    async function executeTest() {
      for await (let buffer of bufferedValuesFrom(source)) {
        results.push(buffer);
        await advancer;
      }
    }

    const complete = executeTest();

    source.next(0);
    source.next(1);
    source.next(2);
    await advancer.next();
    expect(results).toEqual([[0, 1, 2]]);

    // Next batch
    source.next(3);
    source.next(4);
    await advancer.next();
    expect(results).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);

    // end the loop
    source.complete();

    await complete;
    expect(results).toEqual([
      [0, 1, 2],
      [3, 4],
    ]);
  });
});

describe("latestValueFrom", () => {
  test("should work for sync observables", async () => {
    const source = of(1, 2, 3);
    const results: number[] = [];
    for await (const value of latestValueFrom(source)) {
      results.push(value);
    }
    expect(results).toEqual([3]);
  });

  test("should throw if the observable errors", async () => {
    const source = throwError(new Error("bad"));
    let error: any;
    try {
      for await (const _ of latestValueFrom(source)) {
        // do nothing
      }
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("bad");
  });

  test("should support async observables", async () => {
    const source = interval(1).pipe(take(3));
    const results: number[] = [];
    for await (const value of latestValueFrom(source)) {
      results.push(value);
    }
    expect(results).toEqual([0, 1, 2]);
  });

  test("a more in-depth test", async () => {
    const results: number[] = [];
    const source = new Subject<number>();
    const advancer = createAdvancer();

    async function executeTest() {
      for await (let buffer of latestValueFrom(source)) {
        results.push(buffer);
        await advancer;
      }
    }

    const complete = executeTest();

    source.next(0);
    source.next(1);
    source.next(2);
    await advancer.next();
    expect(results).toEqual([2]);

    // Next batch
    source.next(3);
    source.next(4);
    await advancer.next();
    expect(results).toEqual([2, 4]);

    source.next(5);
    source.next(6);

    // end the loop
    source.complete();

    await complete;
    expect(results).toEqual([2, 4, 6]);
  });

  test("a more in-depth with early exit", async () => {
    const results: number[] = [];
    const source = new Subject<number>();
    const advancer = createAdvancer();

    async function executeTest() {
      let i = 0;
      for await (let buffer of latestValueFrom(source)) {
        if (i++ === 2) {
          // cause an early exit here.
          return;
        }
        results.push(buffer);
        await advancer;
      }
    }

    const complete = executeTest();

    source.next(0);
    source.next(1);
    source.next(2);
    await advancer.next();
    expect(results).toEqual([2]);

    // Next batch
    source.next(3);
    source.next(4);
    await advancer.next(); // exit
    expect(results).toEqual([2, 4]);

    // loop would have already exited here.
    source.next(5);
    source.next(6);
    await advancer.next();
    expect(results).toEqual([2, 4]);

    await complete;

    expect(results).toEqual([2, 4]);
  });
});

describe("nextValueFrom", () => {
  test("should work for sync observables", async () => {
    const source = of(1, 2, 3);
    const results: number[] = [];
    for await (const value of nextValueFrom(source)) {
      results.push(value);
    }
    // sync observable would have already completed.
    expect(results).toEqual([]);
  });

  test("should throw if the observable errors", async () => {
    const source = throwError(new Error("bad"));
    let error: any;
    try {
      for await (const _ of nextValueFrom(source)) {
        // do nothing
      }
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("bad");
  });

  test("should support async observables", async () => {
    const source = interval(1).pipe(take(3));
    const results: number[] = [];
    for await (const value of nextValueFrom(source)) {
      results.push(value);
    }
    expect(results).toEqual([0, 1, 2]);
  });

  test("a more in-depth test", async () => {
    const results: number[] = [];
    const source = new Subject<number>();
    const advancer = createAdvancer();

    async function executeTest() {
      for await (let buffer of nextValueFrom(source)) {
        results.push(buffer);
        await advancer;
      }
    }

    const complete = executeTest();

    source.next(0);
    source.next(1);
    source.next(2);
    await advancer.next();
    expect(results).toEqual([0]);

    // Next batch
    source.next(3);
    source.next(4);
    await advancer.next();
    expect(results).toEqual([0, 3]);

    source.next(5);
    source.next(6);

    // end the loop
    source.complete();

    await complete;
    expect(results).toEqual([0, 3, 5]);
  });

  test("a more in-depth with early exit", async () => {
    const results: number[] = [];
    const source = new Subject<number>();
    const advancer = createAdvancer();

    async function executeTest() {
      let i = 0;
      for await (let buffer of nextValueFrom(source)) {
        if (i++ === 2) {
          // cause an early exit here.
          return;
        }
        results.push(buffer);
        await advancer;
      }
    }

    const complete = executeTest();

    source.next(0);
    source.next(1);
    source.next(2);
    await advancer.next();
    expect(results).toEqual([0]);

    // Next batch
    source.next(3);
    source.next(4);
    await advancer.next(); // exit
    expect(results).toEqual([0, 3]);

    // loop would have already exited here.
    source.next(5);
    source.next(6);
    await advancer.next();
    expect(results).toEqual([0, 3]);

    await complete;

    expect(results).toEqual([0, 3]);
  });
});

/**
 * A little trick to get the test to manually advance from
 * one test to the next.
 */
function createAdvancer() {
  const factory = async function*(): AsyncGenerator<any, never, any> {
    let prev: any;
    while (true) {
      prev = yield prev;
    }
  };

  const advancer = factory();
  // prime it
  advancer.next();

  const _next = advancer.next.bind(advancer);
  advancer.next = async () => {
    return _next().then((x) => Promise.resolve(x));
  };
  return advancer;
}
