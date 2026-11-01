package com.bakeconnect.catalog.repository;

import com.bakeconnect.catalog.entity.DiscountRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiscountRuleRepository extends JpaRepository<DiscountRule, UUID> {

    List<DiscountRule> findByActiveTrueOrderByPriorityDesc();

    Optional<DiscountRule> findByCodeAndActiveTrue(String code);

    Optional<DiscountRule> findByCodeIgnoreCaseAndActiveTrue(String code);
}
