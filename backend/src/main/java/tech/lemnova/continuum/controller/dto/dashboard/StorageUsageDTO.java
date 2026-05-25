package tech.lemnova.continuum.controller.dto.dashboard;

/**
 * Representa o uso de armazenamento do vault
 */
public record StorageUsageDTO(
    long usedBytes,           // Bytes usados no B2
    long limitBytes,          // Limite de bytes do plano (e.g., 1024*1024*1024 para 1GB)
    double percentageUsed,    // Percentual (0-100)
    String formattedUsed,     // "123 MB" | "1.2 GB"
    String formattedLimit,    // "500 MB" | "Unlimited"
    boolean isUnlimited       // true se plano tem storage ilimitado
) {
    
    /**
     * Factory method para criar com base em bytes usados e limite
     */
    public static StorageUsageDTO from(long usedBytes, long limitBytes) {
        double percentage = limitBytes <= 0 ? 0 : Math.min((double) usedBytes / limitBytes * 100, 100);
        String formatted = formatBytes(usedBytes);
        String formattedLim = limitBytes > 0 ? formatBytes(limitBytes) : "Unlimited";
        
        return new StorageUsageDTO(
            usedBytes,
            limitBytes,
            percentage,
            formatted,
            formattedLim,
            limitBytes <= 0
        );
    }
    
    /**
     * Formata bytes para string legível (B, KB, MB, GB)
     */
    public static String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        final String[] units = new String[]{"B", "KB", "MB", "GB", "TB"};
        int unitIndex = (int) (Math.log10(bytes) / Math.log10(1024));
        double value = bytes / Math.pow(1024, unitIndex);
        return String.format("%.2f %s", value, units[unitIndex]).replaceAll("\\.0+ ", " ").replaceAll("(\\.[0-9]*?)0+ ", "$1 ");
    }
}
