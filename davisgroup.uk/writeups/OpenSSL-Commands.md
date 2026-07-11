# OpenSSL

In general, in the commands below, no errors being output means there are no
problems with file formats, connections, handshakes, etc. Seeing `OK` is
definitely a good thing.

_Note that any pipe to awk/grep/sed/etc. below can be removed to yield
additional information you might find useful!_

## X.509 certificates

Verify that `pubkey.crt` is in PEM format.

```bash
openssl x509 -in pubkey.crt -noout
```

Print information about `pubkey.crt`.

```bash
openssl x509 -in ~/pubkey.pem -text
```

Verify that the signing CA chain `rootCA.crt` signed the public key certificate
`pubkey.crt`.

```bash
openssl verify -verbose -CAfile rootCA.crt pubkey.crt
```

Print each certificate in the certificate chain `chain.crt` successively in PEM
format.

```bash
openssl crl2pkcs7 -nocrl -certfile chain.crt \
	| openssl pkcs7 -print_certs -text \
	| awk '/-----BEGIN CERTIFICATE-----/ { x = 1; } x { print $0; } /-----END CERTIFICATE-----/ { x = 0; }'
```

Print the issuer information and fingerprint of each certificate in the chain
`chain.crt`.

```bash
openssl crl2pkcs7 -nocrl -certfile chain.crt \
	| openssl pkcs7 -print_certs -text \
	| grep -A 1 '\(Serial\|Issuer:\)' \
	| grep -v '\(Valid\|^--\)' \
	| sed -E -e 's/^[[:space:]]+//' \
	| awk '/^Serial/ { printf "\n"; } { print $0; }'; echo
```

## TLS connections

See if a TLS handshake to a given domain succeeds.

```bash
echo | openssl s_client -connect facebook.com:443 | grep Verification
```
