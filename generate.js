// a(n) = Product_{j=1..n} Product_{k=1..n} (4*cos(j*Pi/(2*n+1))^2 + 4*cos(k*Pi/(2*n+1))^2)
// Result: 1, 2, 36, 6728, 12988816, 258584046368, 53060477521960000, 112202208776036178000000, 2444888770250892795802079170816, 548943583215388338077567813208427340288, 1269984011256235834242602753102293934298576249856

function generate(n) {
  let product = 1;
  for (let j = 1; j <= n; j++) {
    for (let k = 1; k <= n; k++) {
      product *=
        4 * Math.cos((j * Math.PI) / (2 * n + 1)) ** 2 +
        4 * Math.cos((k * Math.PI) / (2 * n + 1)) ** 2;
    }
  }
  return product;
}

for (let i = 0; i <= 10; i++) {
  for (const fn of [generate]) {
    console.log(`a${fn.name.slice(1)}(${i}) = ${fn(i)}`);
  }
}
