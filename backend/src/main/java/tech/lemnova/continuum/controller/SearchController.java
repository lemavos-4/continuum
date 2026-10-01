package tech.lemnova.continuum.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.lemnova.continuum.application.service.SearchService;
import tech.lemnova.continuum.controller.dto.search.SearchResponseDTO;
import tech.lemnova.continuum.infra.security.CustomUserDetails;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ResponseEntity<SearchResponseDTO> search(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(name = "q") String query) {
        
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(new SearchResponseDTO(java.util.List.of(), java.util.List.of()));
        }

        SearchResponseDTO result = searchService.search(user.getUserId(), query);
        return ResponseEntity.ok(result);
    }
}
