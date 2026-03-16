package utils

import (
	"errors"
	"goportal/global"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func getJwtSecret() []byte {
	secret := global.Config.Server.JwtSecret
	if secret == "" {
		secret = "goportal-secret-key-change-me"
	}
	return []byte(secret)
}

type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	DeviceID string `json:"device_id,omitempty"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint, username, deviceID, role string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		DeviceID: deviceID,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJwtSecret())
}

func ParseToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return getJwtSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
