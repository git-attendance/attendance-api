export function UseMiddleware(middleware: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [req, res, next] = args;
      try {
        await new Promise((resolve, reject) => {
          middleware(req, res, (err: any) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(true);
          });
        });
        return await originalMethod.apply(this, args);
      } catch (error) {
        return next(error);
      }
    };

    return descriptor;
  };
}
