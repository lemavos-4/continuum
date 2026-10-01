package tech.lemnova.continuum.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaRedirectController {

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @GetMapping({"/login-successful", "/login-token"})
    public String redirectToFrontend(HttpServletRequest request) {
        String query = request.getQueryString();
        return "redirect:" + frontendUrl + request.getRequestURI() + (query != null ? "?" + query : "");
    }
}
