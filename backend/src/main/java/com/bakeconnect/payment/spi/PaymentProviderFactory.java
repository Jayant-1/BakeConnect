package com.bakeconnect.payment.spi;

import com.bakeconnect.common.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class PaymentProviderFactory {

    private final Map<String, PaymentProvider> providers;
    private final String defaultProviderName;

    public PaymentProviderFactory(
            List<PaymentProvider> providerList,
            @Value("${bakeconnect.payment.provider:MOCK}") String defaultProviderName) {
        this.providers = providerList.stream()
                .collect(Collectors.toMap(
                        p -> p.getProviderName().toUpperCase(),
                        Function.identity(),
                        (existing, replacement) -> existing
                ));
        this.defaultProviderName = defaultProviderName.toUpperCase();
    }

    public PaymentProvider getProvider(String name) {
        if (name == null || name.isBlank()) {
            return getDefaultProvider();
        }
        String normalized = name.trim().toUpperCase().replace("-", "_");
        PaymentProvider provider = providers.get(normalized);
        if (provider == null) {
            throw new BadRequestException("Unsupported payment provider: " + name);
        }
        return provider;
    }

    public PaymentProvider getDefaultProvider() {
        PaymentProvider provider = providers.get(defaultProviderName);
        if (provider == null) {
            return providers.values().stream().findFirst()
                    .orElseThrow(() -> new IllegalStateException("No payment providers registered"));
        }
        return provider;
    }
}
