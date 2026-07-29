<?php
/**
 * Tezra cPanel Email API Gateway
 * 
 * Upload this file to your cPanel hosting (e.g. in public_html/api/send-email.php)
 * and configure CPANEL_EMAIL_API_URL on Vercel.
 */

// Enable CORS for Next.js app calling this
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Api-Key");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Define the API key (must match CPANEL_EMAIL_API_KEY env variable on Vercel)
define("API_KEY", "tezra_secure_email_key_2026");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

// Get Authorization Header or X-Api-Key Header
$headers = getallheaders();
$providedKey = "";

if (isset($headers["X-Api-Key"])) {
    $providedKey = $headers["X-Api-Key"];
} elseif (isset($headers["x-api-key"])) {
    $providedKey = $headers["x-api-key"];
}

if (empty($providedKey) || $providedKey !== API_KEY) {
    http_response_code(401);
    echo json_encode(["success" => false, "error" => "Unauthorized api key verification failed"]);
    exit;
}

// Parse request input parameters
$input = json_decode(file_get_contents("php://input"), true);
$to = isset($input["to"]) ? trim($input["to"]) : "";
$subject = isset($input["subject"]) ? trim($input["subject"]) : "";
$html = isset($input["html"]) ? $input["html"] : "";
$fromEmail = isset($input["fromEmail"]) ? trim($input["fromEmail"]) : "noreply@tezra.xyz";

if (empty($to) || empty($subject) || empty($html)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required fields: to, subject, or html content"]);
    exit;
}

// Set up email headers for HTML content
$mailHeaders = "MIME-Version: 1.0" . "\r\n";
$mailHeaders .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$mailHeaders .= "From: Tezra <" . $fromEmail . ">" . "\r\n";
$mailHeaders .= "Reply-To: " . $fromEmail . "\r\n";
$mailHeaders .= "X-Mailer: PHP/" . phpversion() . "\r\n";

// Execute native mail function
if (mail($to, $subject, $html, $mailHeaders)) {
    echo json_encode(["success" => true, "message" => "Email dispatched successfully from cPanel server"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "PHP mail() function returned false. Check hosting mail configuration"]);
}
