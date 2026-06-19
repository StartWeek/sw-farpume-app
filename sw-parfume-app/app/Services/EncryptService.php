<?php

namespace App\Services;

class EncryptService
{
    protected string $key;

    public function __construct()
    {
        $this->key = (string) 'b3r4sput1h';
    }

    protected function encryptAscii(string $str): string
    {
        $dataKey = str_split($this->key);

        $strEnc = '';
        $nkey = 0;
        $jml = strlen($str);

        for ($i = 0; $i < $jml; $i++) {
            $ascii = ord($str[$i]) + ord($dataKey[$nkey]);
            $strEnc .= strtoupper(dechex($ascii));

            if ($nkey === count($dataKey) - 1) {
                $nkey = 0;
            }

            $nkey++;
        }

        return strtoupper($strEnc);
    }

    protected function decryptAscii(string $str): string
    {
        $dataKey = str_split($this->key);

        $strDec = '';
        $nkey = 0;
        $jml = strlen($str);

        $i = 0;
        while ($i < $jml) {
            $hex = substr($str, $i, 2);

            $ascii = hexdec($hex) - ord($dataKey[$nkey]);

            $strDec .= chr($ascii);

            if ($nkey === count($dataKey) - 1) {
                $nkey = 0;
            }

            $nkey++;

            $i += 2;
        }

        return $strDec;
    }

    protected function autoType(string $value)
    {
        if ($value === 'true') {
            return true;
        }

        if ($value === 'false') {
            return false;
        }

        if (is_numeric($value) && trim((string)$value) !== '') {
            return strpos((string)$value, '.') !== false
                ? (float)$value
                : (int)$value;
        }

        return $value;
    }

    /**
     * @param mixed $data
     */
    public function doEncrypt(mixed $data, array $ignore = [])
    {
        if ($data === null) {
            return null;
        }

        // Primitive
        if (
            is_string($data) ||
            is_numeric($data) ||
            is_bool($data)
        ) {
            return $this->encryptAscii((string)$data);
        }

        // Array
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (in_array($key, $ignore, true)) {
                    continue;
                }

                if (
                    is_string($value) ||
                    is_numeric($value) ||
                    is_bool($value)
                ) {
                    $data[$key] = $this->encryptAscii((string)$value);
                } elseif (is_array($value)) {
                    $data[$key] = $this->doEncrypt($value, $ignore);
                }
            }

            return $data;
        }

        // Object
        if (is_object($data)) {
            foreach ($data as $key => $value) {
                if (in_array($key, $ignore, true)) {
                    continue;
                }

                if (
                    is_string($value) ||
                    is_numeric($value) ||
                    is_bool($value)
                ) {
                    $data->{$key} = $this->encryptAscii((string)$value);
                } elseif (is_array($value) || is_object($value)) {
                    $data->{$key} = $this->doEncrypt($value, $ignore);
                }
            }

            return $data;
        }

        return $data;
    }

    public function doDecrypt(mixed $data, array $ignore = [])
    {
        if ($data === null) {
            return null;
        }

        // Primitive encrypted string
        if (is_string($data)) {
            return $this->autoType(
                $this->decryptAscii($data)
            );
        }

        // Array
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (in_array($key, $ignore, true)) {
                    continue;
                }

                if (is_string($value)) {
                    $data[$key] = $this->autoType(
                        $this->decryptAscii($value)
                    );
                } elseif (is_array($value) || is_object($value)) {
                    $data[$key] = $this->doDecrypt($value, $ignore);
                }
            }

            return $data;
        }

        // Object
        if (is_object($data)) {
            foreach ($data as $key => $value) {
                if (in_array($key, $ignore, true)) {
                    continue;
                }

                if (is_string($value)) {
                    $data->{$key} = $this->autoType(
                        $this->decryptAscii($value)
                    );
                } elseif (is_array($value) || is_object($value)) {
                    $data->{$key} = $this->doDecrypt($value, $ignore);
                }
            }

            return $data;
        }

        return $data;
    }
}