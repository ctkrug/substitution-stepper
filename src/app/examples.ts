export interface Example {
  name: string;
  source: string;
}

/** One-click SICP classics — the wow-moment demo (factorial) leads the list. */
export const EXAMPLES: Example[] = [
  {
    name: "Factorial",
    source: `(define (factorial n)
  (if (= n 0)
      1
      (* n (factorial (- n 1)))))

(factorial 5)`,
  },
  {
    name: "Fibonacci",
    source: `(define (fib n)
  (if (< n 2)
      n
      (+ (fib (- n 1)) (fib (- n 2)))))

(fib 6)`,
  },
  {
    name: "Sum to n",
    source: `(define (sum-to n)
  (if (= n 0)
      0
      (+ n (sum-to (- n 1)))))

(sum-to 5)`,
  },
  {
    name: "Ackermann",
    source: `(define (ackermann m n)
  (cond ((= m 0) (+ n 1))
        ((= n 0) (ackermann (- m 1) 1))
        (else (ackermann (- m 1) (ackermann m (- n 1))))))

(ackermann 2 3)`,
  },
];
