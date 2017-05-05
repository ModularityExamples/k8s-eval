"use strict";

function isPrime(n) {
  if (n <= 3) { return n > 1; }
  if (n % 2 == 0 || n % 3 == 0) { return false; }
  for (var  i = 5; i * i <= n; i += 6) {
    if (n % i == 0 || n % (i + 2) == 0) { return false; }
  }
  return true;
}

// Finds the next prime number following the given seed number
module.exports = function(seed) {
  var nextPrime = ++seed;
  while (!isPrime(nextPrime)) {
    nextPrime++;
  }

  return nextPrime;
}
