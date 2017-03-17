module.exports = {
  trap(callable) {

    const calls = {"errors": 0};

    function surrogate() {
      return new Promise(resolve => process.nextTick(resolve("The circuit is open")));
    }

    return {
      exec(...args) {

        return calls.errors > 1 ? callable(...args).catch(err => {
          calls.errors += 1;
          throw err;
        }) : surrogate();
      }
    };
  }
};
