<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth-login', function (Request $request) {
            $identifier = (string) $request->input('identifier', 'guest');

            return [
                Limit::perMinute(10)->by($request->ip().'|'.$identifier),
            ];
        });

        RateLimiter::for('password-recovery', function (Request $request) {
            $email = (string) $request->input('email', 'guest');

            return [
                Limit::perMinute(6)->by($request->ip().'|'.$email),
            ];
        });
    }
}
